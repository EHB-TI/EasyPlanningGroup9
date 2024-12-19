// Import necessary modules
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const moment = require("moment-timezone");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Reference to Realtime Database
const db = admin.database();

// Configuration Constants
const WEEKS_TO_KEEP = 7; // Total number of weeks to retain
const WEEKS_TO_CLOSE = 2; // Number of weeks to close each run
const TIMEZONE = "Europe/Brussels"; // Time zone for scheduling

/**
 * Fetch all existing weeks from the database.
 * @return {Object} An object containing all weeks.
 */
async function getCurrentWeeks() {
  const weeksSnapshot = await db.ref("weeks").once("value");
  return weeksSnapshot.val() || {};
}

/**
 * Add a new week to the database.
 * @param {string} weekStartDate -
 */
async function addWeek(weekStartDate) {
  const weekId = `week_${weekStartDate}`;
  const weekData = {
    start_date: weekStartDate,
    end_date: moment(weekStartDate).endOf("isoWeek").format("YYYY-MM-DD"),
    is_closed: false, // New week is open by default
    is_active: true, // Active by default
    status: "open",
    created_by: "system",
    created_at: moment().toISOString(),
    updated_at: moment().toISOString(),
  };

  await db.ref(`weeks/${weekId}`).set(weekData);
  console.log(`Added week: ${weekId}`);
  return weekData; // Return the week data for local updates
}

/**
 * Close the specified number of oldest open weeks.
 * @param {Object} weeks - All current weeks.
 * @param {number} weeksToClose - Number of weeks to close.
 */
async function closeOldestOpenWeeks(weeks, weeksToClose) {
  // Convert weeks object to an array and sort by start_date ascending
  const sortedWeeks = Object.values(weeks)
      .sort((a, b) => moment(a.start_date).diff(moment(b.start_date)));

  let closedCount = 0;

  for (const week of sortedWeeks) {
    if (!week.is_closed && closedCount < weeksToClose) {
      const weekId = `week_${week.start_date}`;
      await db.ref(`weeks/${weekId}/is_closed`).set(true);
      await db.ref(`weeks/${weekId}/status`).set("closed");
      await db.ref(`weeks/${weekId}/updated_at`).set(moment().toISOString());
      console.log(`Closed week: ${weekId}`);
      closedCount++;
    }

    if (closedCount >= weeksToClose) break;
  }

  if (closedCount < weeksToClose) {
    console.log(`Only ${closedCount} open week(s) were closed.`);
  }
}

/**
 * Remove old weeks, keeping only the latest WEEKS_TO_KEEP weeks.
 * @param {Object} weeks - All current weeks.
 * @param {number} weeksToKeep - Number of weeks to keep.
 */
async function removeOldWeeks(weeks, weeksToKeep) {
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
    await db.ref(`weeks/${weekKey}`).remove();
    console.log(`Removed week: ${weekKey}`);
  }

  if (weeksToDelete.length === 0) {
    console.log("No weeks to remove.");
  }
}

/**
 * Cloud Function to manage weeks in the database.
 * - Adds new weeks to reach WEEKS_TO_KEEP.
 * - Closes the two oldest open weeks.
 * - Removes old weeks to maintain exactly seven weeks.
 */
exports.manageWeeks = functions.pubsub
    .schedule("59 23 * * 0") // Every Sunday at 23:59
    .timeZone(TIMEZONE) // Adjust to your time zone
    .onRun(async () => {
      console.log("Starting week management process...");

      try {
        // Step 1: Fetch current weeks from the database
        const weeks = await getCurrentWeeks();
        const weekKeys = Object.keys(weeks);
        console.log(`Fetched ${weekKeys.length} week(s) from the database.`);

        // Step 2: Determine how many weeks need to be added
        let weeksToAdd = WEEKS_TO_KEEP - weekKeys.length;
        if (weeksToAdd <= 0) weeksToAdd = 0;

        console.log(`Weeks to add: ${weeksToAdd}`);

        // Step 3: Initialize startWeek to the current week
        const startWeek = moment().startOf("isoWeek");
        console.log(`Starting from current week:
        ${startWeek.format("YYYY-MM-DD")}`);

        // Step 4: Add missing weeks
        for (let i = 0; i < weeksToAdd; i++) {
          const weekStartDate = startWeek.format("YYYY-MM-DD");

          // Check if the week already exists
          const weekExists = Object.values(weeks).some(
              (week) => week.start_date === weekStartDate);

          if (!weekExists) {
            const newWeekData = await addWeek(weekStartDate);
            weeks[`week_${weekStartDate}`] = newWeekData;
            console.log(`Added week: ${weekStartDate}`);
          } else {
            console.log(`Week starting on ${weekStartDate}
            already exists. Skipping addition.`);
          }

          startWeek.add(1, "weeks"); // Move to the next week
        }

        // Step 5: Close the oldest two open weeks
        await closeOldestOpenWeeks(weeks, WEEKS_TO_CLOSE);

        // Step 6: Remove old weeks to maintain exactly WEEKS_TO_KEEP weeks
        await removeOldWeeks(weeks, WEEKS_TO_KEEP);

        console.log("Week management process completed successfully.");
        return null;
      } catch (error) {
        console.error("Error during week management process:", error);
        return null;
      }
    });
