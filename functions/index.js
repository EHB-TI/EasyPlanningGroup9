const functions = require("firebase-functions");
const admin = require("firebase-admin");
const moment = require("moment-timezone");

admin.initializeApp();

const db = admin.database();
const TIMEZONE = "Europe/Brussels";
const WEEKS_TO_KEEP = 7;
const DAYS_OF_WEEK =
["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/**
 * Add shifts for a given week.
 * @param {string} weekId - The ID of the week (e.g., "week_2024-12-16").
 * @param {string} weekStartDate - Start date of the week ("YYYY-MM-DD").
 */
async function addShifts(weekId, weekStartDate) {
  const startDate = moment(weekStartDate, "YYYY-MM-DD");

  for (let i = 0; i < 7; i++) {
    const shiftDate = startDate.clone().add(i, "days");
    const dayName = DAYS_OF_WEEK[i];
    const status = dayName ===
    "saturday" ? "closed" : "active"; // Close shifts on Saturdays

    const shiftId = `shift_${shiftDate.format("YYYY-MM-DD")}`;
    const shiftData = {
      assigned_workers: 0,
      date: shiftDate.format("YYYY-MM-DD"),
      max_workers: 0, // Default to 0; update manually
      status: status,
      week_id: weekId,
    };

    await db.ref(`shifts/${shiftId}`).set(shiftData);
    console.log(`Added shift: ${shiftId}`);
  }
}

/**
 * Remove old weeks and associated shifts.
 * @param {Object} weeks - All current weeks.
 * @param {number} weeksToKeep - Number of weeks to keep.
 */
async function removeOldWeeksAndShifts(weeks, weeksToKeep) {
  const weekKeys = Object.keys(weeks);

  // Sort weeks by start_date ascending
  weekKeys.sort((a, b) => {
    const dateA = moment(weeks[a].start_date, "YYYY-MM-DD");
    const dateB = moment(weeks[b].start_date, "YYYY-MM-DD");
    return dateA - dateB;
  });

  // Identify weeks to delete (all except the latest `weeksToKeep`)
  const weeksToDelete = weekKeys.slice(0, weekKeys.length - weeksToKeep);

  for (const weekKey of weeksToDelete) {
    // Remove week and associated shifts
    await db.ref(`weeks/${weekKey}`).remove();
    console.log(`Removed week: ${weekKey}`);

    const weekStartDate = weeks[weekKey].start_date;
    const startDate = moment(weekStartDate, "YYYY-MM-DD");

    for (let i = 0; i < 7; i++) {
      const shiftDate = startDate.clone().add(i, "days").format("YYYY-MM-DD");
      const shiftId = `shift_${shiftDate}`;

      await db.ref(`shifts/${shiftId}`).remove();
      console.log(`Removed shift: ${shiftId}`);
    }
  }

  if (weeksToDelete.length === 0) {
    console.log("No weeks to remove.");
  }
}

/**
 * Cloud Function to manage weeks and shifts.
 */
exports.manageWeeksAndShifts = functions.pubsub
    .schedule("59 23 * * 0") // Every Sunday at 23:59
    .timeZone(TIMEZONE)
    .onRun(async () => {
      try {
        const weeksSnapshot = await db.ref("weeks").once("value");
        const weeks = weeksSnapshot.val() || {};
        const weekKeys = Object.keys(weeks);
        console.log(`Fetched ${weekKeys.length} week(s) from the database.`);

        // Calculate weeks to add
        const weeksToAdd = WEEKS_TO_KEEP - weekKeys.length;
        const startWeek = moment().startOf("isoWeek");
        console.log(`Weeks to add: ${weeksToAdd}`);

        for (let i = 0; i < weeksToAdd; i++) {
          const weekStartDate =
          startWeek.clone().add(i, "weeks").format("YYYY-MM-DD");
          const weekId = `week_${weekStartDate}`;

          // Add week to database
          const weekData = {
            start_date: weekStartDate,
            end_date: startWeek.clone().endOf("isoWeek").format("YYYY-MM-DD"),
            is_closed: false,
            is_active: true,
            status: "open",
            created_by: "system",
            created_at: moment().toISOString(),
            updated_at: moment().toISOString(),
          };

          await db.ref(`weeks/${weekId}`).set(weekData);
          console.log(`Added week: ${weekId}`);

          // Add shifts for the new week
          await addShifts(weekId, weekStartDate);
        }

        // Remove old weeks and shifts to maintain exactly WEEKS_TO_KEEP weeks
        await removeOldWeeksAndShifts(weeks, WEEKS_TO_KEEP);

        console.log("Week and shift management completed successfully.");
      } catch (error) {
        console.error("Error managing weeks and shifts:", error);
      }
    });

/**
 * HTTP Function to update the status of a shift.
 */
exports.updateShiftStatus = functions.https.onRequest(async (req, res) => {
  const {shiftId, status} = req.body;

  if (!shiftId || !status) {
    return res.status(400).send("Missing required parameters:" +
    "shiftId or status.");
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
    return res.status(200).send(`Shift
    ${shiftId} updated to status: ${status}`);
  } catch (error) {
    console.error("Error updating shift status:", error);
    return res.status(500).send("Internal Server Error.");
  }
});
