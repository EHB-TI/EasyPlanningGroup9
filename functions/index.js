const functions = require("firebase-functions");
const admin = require("firebase-admin");
const moment = require("moment-timezone");

admin.initializeApp();

const db = admin.database();
const TIMEZONE = "Europe/Brussels";
const WEEKS_AHEAD = 7; // Number of weeks to keep ahead of the current week
const WEEKS_BEHIND = 1; // Number of weeks to keep behind the current week
const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/**
 * Add shifts for a given week.
 * @param {string} weekId - The ID of the week (e.g., "week_2024-12-16").
 * @param {string} weekStartDate - Start date of the week ("YYYY-MM-DD").
 */
async function addShifts(weekId, weekStartDate) {
  const startDate = moment(weekStartDate, "YYYY-MM-DD");

  const updates = {};
  for (let i = 0; i < 7; i++) {
    const shiftDate = startDate.clone().add(i, "days");
    const dayName = DAYS_OF_WEEK[i];
    const status = dayName === "saturday" ? "closed" : "active"; // Close shifts on Saturdays

    const shiftId = `shift_${shiftDate.format("YYYY-MM-DD")}`;
    updates[`shifts/${shiftId}`] = {
      assigned_workers: 0,
      date: shiftDate.format("YYYY-MM-DD"),
      max_workers: 0, // Default to 0; update manually
      status: status,
      week_id: weekId,
      created_at: moment().toISOString(),
      updated_at: moment().toISOString(),
    };
  }

  await db.ref().update(updates);
  console.log(`Added shifts for week: ${weekId}`);
}

/**
 * Remove a week and its associated shifts.
 * @param {string} weekKey - The key of the week to remove.
 * @param {Object} weekData - The data of the week to remove.
 */
async function removeWeekAndShifts(weekKey, weekData) {
  const updates = {};
  // Remove the week
  updates[`weeks/${weekKey}`] = null;

  // Remove associated shifts
  const startDate = moment(weekData.start_date, "YYYY-MM-DD");
  for (let i = 0; i < 7; i++) {
    const shiftDate = startDate.clone().add(i, "days").format("YYYY-MM-DD");
    const shiftId = `shift_${shiftDate}`;
    updates[`shifts/${shiftId}`] = null;
  }

  await db.ref().update(updates);
  console.log(`Removed week and shifts for: ${weekKey}`);
}

/**
 * Cloud Function to manage weeks and shifts dynamically.
 */
exports.manageWeeksAndShifts = functions.pubsub
  .schedule("59 23 * * 0") // Every Sunday at 23:59
  .timeZone(TIMEZONE)
  .onRun(async () => {
    try {
      const now = moment().tz(TIMEZONE).startOf("day");
      const currentWeekStart = now.clone().startOf("isoWeek"); // ISO week starts on Monday

      // Define the range of weeks to keep
      const desiredWeeks = [];
      for (let i = -WEEKS_BEHIND; i <= WEEKS_AHEAD; i++) {
        const weekStart = currentWeekStart.clone().add(i, "weeks");
        const weekId = `week_${weekStart.format("YYYY-MM-DD")}`;
        desiredWeeks.push({
          week_id: weekId,
          start_date: weekStart.format("YYYY-MM-DD"),
          end_date: weekStart.clone().endOf("isoWeek").format("YYYY-MM-DD"),
        });
      }

      // Fetch existing weeks from the database
      const weeksSnapshot = await db.ref("weeks").once("value");
      const existingWeeks = weeksSnapshot.val() || {};

      const existingWeekKeys = Object.keys(existingWeeks);

      // Determine weeks to add and weeks to remove
      const desiredWeekIds = desiredWeeks.map((week) => week.week_id);
      const weeksToAdd = desiredWeeks.filter((week) => !Object.prototype.hasOwnProperty.call(existingWeeks, week.week_id));
      const weeksToRemove = existingWeekKeys.filter((weekId) => !desiredWeekIds.includes(weekId));

      console.log(`Desired weeks to maintain: ${desiredWeekIds.length}`);
      console.log(`Weeks to add: ${weeksToAdd.length}`);
      console.log(`Weeks to remove: ${weeksToRemove.length}`);

      // Add missing weeks and their shifts
      const addPromises = weeksToAdd.map(async (week) => {
        // Determine the status of the week
        let status = "open"; // Default to open
        if (week.week_id === `week_${currentWeekStart.format("YYYY-MM-DD")}`) {
          status = "active"; // Current week is active
        } else if (week.week_id === `week_${currentWeekStart.clone().subtract(1, "weeks").format("YYYY-MM-DD")}`) {
          status = "closed"; // Previous week is closed
        }

        const weekData = {
          start_date: week.start_date,
          end_date: week.end_date,
          is_closed: status === "closed",
          is_active: status === "active",
          status: status,
          created_by: "system",
          created_at: moment().toISOString(),
          updated_at: moment().toISOString(),
        };

        await db.ref(`weeks/${week.week_id}`).set(weekData);
        console.log(`Added week: ${week.week_id} with status: ${status}`);

        // Add shifts for the new week
        await addShifts(week.week_id, week.start_date);
      });

      // Remove old weeks and their shifts
      const removePromises = weeksToRemove.map(async (weekId) => {
        const weekData = existingWeeks[weekId];
        await removeWeekAndShifts(weekId, weekData);
      });

      // Execute all add and remove operations concurrently
      await Promise.all([...addPromises, ...removePromises]);

      console.log("Dynamic week and shift management completed successfully.");
    } catch (error) {
      console.error("Error managing weeks and shifts:", error);
    }
  });

/**
 * HTTP Function to update the status of a shift.
 */
exports.updateShiftStatus = functions.https.onRequest(async (req, res) => {
  // Enable CORS if needed, handle methods etc.
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed. Use POST.");
  }

  const {shiftId, status} = req.body;

  if (!shiftId || !status) {
    return res.status(400).send("Missing required parameters: shiftId or status.");
  }

  try {
    const shiftRef = db.ref(`shifts/${shiftId}`);
    const shiftSnapshot = await shiftRef.once("value");

    if (!shiftSnapshot.exists()) {
      return res.status(404).send(`Shift with ID ${shiftId} not found.`);
    }

    await shiftRef.update({
      status: status,
      updated_at: moment().toISOString(),
    });

    console.log(`Updated shift ${shiftId} to status: ${status}`);
    return res.status(200).send(`Shift ${shiftId} updated to status: ${status}`);
  } catch (error) {
    console.error("Error updating shift status:", error);
    return res.status(500).send("Internal Server Error.");
  }
});
