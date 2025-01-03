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
 * [No changes here... your existing code remains the same]
 */
async function addShifts(weekId, weekStartDate) {
  console.log(`[DEBUG] Adding shifts for week ${weekId} starting at ${weekStartDate}`);
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

    console.log(`[DEBUG] Prepared shift ${shiftId} with status "${status}"`);
  }

  await db.ref().update(updates);
  console.log(`[DEBUG] Added shifts for week: ${weekId}`);
}

/**
 * Helper function to find and prepare deletions for a given node.
 * [No changes here... your existing code remains the same]
 */
async function findAndDeleteRelatedEntries(nodePath, targetObject, shiftIdsToDelete) {
  console.log(`[DEBUG] Checking ${nodePath} for entries to delete...`);
  console.log(`[DEBUG] shiftIdsToDelete:`, shiftIdsToDelete);

  const entriesSnapshot = await db.ref(nodePath).orderByChild("shift_id").once("value");
  const entries = entriesSnapshot.val() || {};

  console.log(`[DEBUG] ${nodePath} snapshot retrieved. Found ${Object.keys(entries).length} entries.`);

  let matchedCount = 0;
  for (const [entryKey, entryValue] of Object.entries(entries)) {
    // Debug each entry’s shift_id
    console.log(`[DEBUG] ${nodePath}/${entryKey} => shift_id: ${entryValue.shift_id}`);

    if (shiftIdsToDelete.includes(entryValue.shift_id.trim())) {
      console.log(`[DEBUG] Marking ${nodePath}/${entryKey} for deletion.`);
      targetObject[`${nodePath}/${entryKey}`] = null;
      matchedCount++;
    }
  }

  console.log(`[DEBUG] Total ${nodePath} entries marked for deletion: ${matchedCount}`);
}

/**
 * Cloud Function to manage weeks and shifts dynamically based on date range.
 */
exports.manageWeeksAndShifts = functions.pubsub
  .schedule("59 23 * * 0") // Every Sunday at 23:59
  .timeZone(TIMEZONE)
  .onRun(async () => {
    try {
      console.log("[DEBUG] manageWeeksAndShifts function triggered.");

      const now = moment().tz(TIMEZONE).startOf("day");
      const currentWeekStart = now.clone().startOf("isoWeek"); // ISO week starts on Monday
      console.log(`[DEBUG] Current week start: ${currentWeekStart.format("YYYY-MM-DD")}`);

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

      console.log(`[DEBUG] desiredWeeks:`, desiredWeeks);

      // Fetch existing weeks from the database
      console.log("[DEBUG] Fetching existing weeks from DB...");
      const weeksSnapshot = await db.ref("weeks").once("value");
      const existingWeeks = weeksSnapshot.val() || {};
      const existingWeekKeys = Object.keys(existingWeeks);

      console.log("[DEBUG] existingWeekKeys:", existingWeekKeys);

      // Determine weeks to add and weeks to remove
      const desiredWeekIds = desiredWeeks.map((week) => week.week_id);
      const weeksToAdd = desiredWeeks.filter((week) => !Object.prototype.hasOwnProperty.call(existingWeeks, week.week_id));
      const weeksToRemove = existingWeekKeys.filter((weekId) => !desiredWeekIds.includes(weekId));

      console.log(`[DEBUG] Desired weeks to maintain: ${desiredWeekIds.join(", ")}`);
      console.log(`[DEBUG] Weeks to add: ${weeksToAdd.map((w) => w.week_id).join(", ")}`);
      console.log(`[DEBUG] Weeks to remove: ${weeksToRemove.join(", ")}`);

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

        console.log(`[DEBUG] Adding week: ${week.week_id} with status: ${status}`);
        await db.ref(`weeks/${week.week_id}`).set(weekData);

        // Add shifts for the new week
        await addShifts(week.week_id, week.start_date);
      });

      // Remove old weeks and their shifts, along with related assignments and applications
      const removePromises = weeksToRemove.map(async (weekId) => {
        console.log(`[DEBUG] Removing old week: ${weekId}`);
        const weekData = existingWeeks[weekId];
        await removeWeekAndShifts(weekId, weekData);
      });

      // Wait for add and remove operations
      await Promise.all([...addPromises, ...removePromises]);

      // Define the earliest and latest dates based on WEEKS_BEHIND and WEEKS_AHEAD
      const earliestDate = currentWeekStart.clone().subtract(WEEKS_BEHIND, "weeks").startOf("isoWeek");
      const latestDate = currentWeekStart.clone().add(WEEKS_AHEAD, "weeks").endOf("isoWeek");

      console.log(`[DEBUG] Earliest retained shift date: ${earliestDate.format("YYYY-MM-DD")}`);
      console.log(`[DEBUG] Latest retained shift date: ${latestDate.format("YYYY-MM-DD")}`);

      // Clean up any shifts that are outside the desired date range
      await cleanUpShiftsOutOfRange(earliestDate, latestDate);

      // --------------------------------------------------
      // NEW STEP: AUTO-ASSIGN FIXED DAYS (CURRENT WEEK + 2)
      // ALSO CHECK 1 PREVIOUS WEEK FOR NEW USERS
      // --------------------------------------------------

      // We'll assign from (currentWeekStart - 1 week) to (currentWeekStart + 2 weeks).
      const startForAssignments = currentWeekStart.clone().subtract(1, "weeks");
      const endForAssignments = currentWeekStart.clone().add(2, "weeks");
      await autoAssignFixedDaysToShifts(startForAssignments, endForAssignments);

      console.log("[DEBUG] Dynamic week and shift management + fixed-day assignments completed successfully.");
    } catch (error) {
      console.error("[ERROR] Error managing weeks and shifts:", error);
    }
  });

/**
 * Remove a week and its associated shifts, along with related assignments and applications.
 * [No changes to your existing removeWeekAndShifts logic...]
 */
async function removeWeekAndShifts(weekKey, weekData) {
  console.log(`[DEBUG] Removing week ${weekKey}`);
  console.log(`[DEBUG] Week data:`, weekData);

  const updates = {};
  // Remove the week
  updates[`weeks/${weekKey}`] = null;

  // Collect shift IDs to be deleted
  const shiftIdsToDelete = [];
  const startDate = moment(weekData.start_date, "YYYY-MM-DD");
  for (let i = 0; i < 7; i++) {
    const shiftDate = startDate.clone().add(i, "days").format("YYYY-MM-DD");
    const shiftId = `shift_${shiftDate}`;
    updates[`shifts/${shiftId}`] = null;
    shiftIdsToDelete.push(shiftId);
  }

  console.log(`[DEBUG] shiftIdsToDelete:`, shiftIdsToDelete);

  // Initialize paths for assignments and applications to delete
  const assignmentsToDelete = {};
  const applicationsToDelete = {};

  // Find and mark assignments for deletion
  await findAndDeleteRelatedEntries("assignments", assignmentsToDelete, shiftIdsToDelete);

  // Find and mark applications for deletion
  await findAndDeleteRelatedEntries("applications", applicationsToDelete, shiftIdsToDelete);

  // Merge all deletions into the updates object
  Object.assign(updates, assignmentsToDelete, applicationsToDelete);

  console.log(`[DEBUG] Total deletions to perform: ${Object.keys(updates).length}`);

  // Execute the multi-path update to delete weeks, shifts, assignments, and applications
  await db.ref().update(updates);

  console.log(`[DEBUG] Removed week and shifts for: ${weekKey}`);
  console.log(
    `[DEBUG] Deleted ${Object.keys(assignmentsToDelete).length} assignments and ` +
    `${Object.keys(applicationsToDelete).length} applications related to deleted shifts.`);
}

/**
 * Remove any shifts (and their related assignments/applications) that are outside the desired date range.
 * [No changes to your existing cleanUpShiftsOutOfRange logic...]
 */
async function cleanUpShiftsOutOfRange(earliestDate, latestDate) {
  console.log(`[DEBUG] Initiating cleanup of shifts outside the range from ${earliestDate.format("YYYY-MM-DD")} to ${latestDate.format("YYYY-MM-DD")}...`);

  // Fetch all shifts
  const shiftsSnapshot = await db.ref("shifts").once("value");
  const allShifts = shiftsSnapshot.val() || {};
  const allShiftKeys = Object.keys(allShifts);

  console.log(`[DEBUG] Found ${allShiftKeys.length} total shifts in the database.`);

  // Determine shifts to delete: those before earliestDate or after latestDate
  const shiftsToDelete = allShiftKeys.filter((shiftId) => {
    const dateMatch = shiftId.match(/^shift_(\d{4}-\d{2}-\d{2})$/);
    if (!dateMatch) {
      console.warn(`[WARN] Shift ID ${shiftId} does not match expected format. Skipping.`);
      return false; // Skip shifts with unexpected format
    }
    const shiftDate = moment(dateMatch[1], "YYYY-MM-DD");
    if (!shiftDate.isValid()) {
      console.warn(`[WARN] Shift ID ${shiftId} has invalid date. Skipping.`);
      return false; // Skip shifts with invalid dates
    }
    return shiftDate.isBefore(earliestDate) || shiftDate.isAfter(latestDate);
  });

  console.log(`[DEBUG] Shifts to delete based on date range:`, shiftsToDelete);

  // Additionally, find orphaned shift_ids in assignments and applications
  const assignmentsSnapshot = await db.ref("assignments").once("value");
  const assignments = assignmentsSnapshot.val() || {};
  const assignmentShiftIds = new Set(Object.values(assignments).map((a) => a.shift_id.trim()));

  const applicationsSnapshot = await db.ref("applications").once("value");
  const applications = applicationsSnapshot.val() || {};
  const applicationShiftIds = new Set(Object.values(applications).map((a) => a.shift_id.trim()));

  // Combine all referenced shift_ids
  const referencedShiftIds = new Set([...assignmentShiftIds, ...applicationShiftIds]);

  // Identify orphaned shift_ids: referenced but not present in shifts node and not already marked for deletion
  referencedShiftIds.forEach((shiftId) => {
    if (!Object.prototype.hasOwnProperty.call(allShifts, shiftId) && !shiftsToDelete.includes(shiftId)) {
      console.log(`[DEBUG] Identified orphaned shift_id: ${shiftId}`);
      shiftsToDelete.push(shiftId);
    }
  });

  console.log(`[DEBUG] Total shifts to delete after including orphaned shift_ids:`, shiftsToDelete);

  if (shiftsToDelete.length === 0) {
    console.log(`[DEBUG] No shifts to delete outside the desired range.`);
    return;
  }

  // Initialize paths for shifts, assignments, and applications to delete
  const updates = {};

  // Prepare deletion paths for shifts
  shiftsToDelete.forEach((shiftId) => {
    updates[`shifts/${shiftId}`] = null;
  });

  // Collect shift IDs for related deletions
  const relatedShiftIds = shiftsToDelete;

  // Find and mark assignments for deletion
  await findAndDeleteRelatedEntries("assignments", updates, relatedShiftIds);

  // Find and mark applications for deletion
  await findAndDeleteRelatedEntries("applications", updates, relatedShiftIds);

  console.log(`[DEBUG] Total deletions to perform in cleanup: ${Object.keys(updates).length}`);

  // Execute the multi-path update to delete shifts, assignments, and applications
  await db.ref().update(updates);

  console.log(`[DEBUG] Cleanup of undesired shifts and related entries completed.`);
}

/**
 * HTTP Function to update the status of a shift.
 * [No changes here... your existing code remains the same]
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
    console.log(`[DEBUG] updateShiftStatus called with shiftId=${shiftId}, status=${status}`);

    const shiftRef = db.ref(`shifts/${shiftId}`);
    const shiftSnapshot = await shiftRef.once("value");

    if (!shiftSnapshot.exists()) {
      console.log(`[DEBUG] Shift ${shiftId} not found in DB.`);
      return res.status(404).send(`Shift with ID ${shiftId} not found.`);
    }

    await shiftRef.update({
      status: status,
      updated_at: moment().toISOString(),
    });

    console.log(`[DEBUG] Updated shift ${shiftId} to status: ${status}`);
    return res.status(200).send(`Shift ${shiftId} updated to status: ${status}`);
  } catch (error) {
    console.error("[ERROR] Error updating shift status:", error);
    return res.status(500).send("Internal Server Error.");
  }
});

/* ------------------------------------------------------------------------
   NEW FUNCTION: AUTO-ASSIGN WORKERS TO FIXED-DAY SHIFTS FOR A DATE RANGE
   currentWeekStart - 1 week   => for new users in the previous week
   currentWeekStart + 2 weeks => next 2 weeks
------------------------------------------------------------------------- */
/**
 * AUTO-ASSIGN WORKERS TO SHIFTS IF IT MATCHES THEIR FIXED DAY
 * AND ADD { fixed_day: true } IN THE ASSIGNMENT.
 *
 * This version:
 *  - Iterates over *all* shifts (no date/status checks)
 *  - Parses the dayOfWeek from shift_YYYY-MM-DD
 *  - If worker's fixed_days includes that day, sets assignment.fixed_day = true
 */
async function autoAssignFixedDaysToShifts() {
  console.log("[DEBUG] autoAssignFixedDaysToShifts: Starting...");

  // 1) Fetch all workers
  const workersSnap = await db.ref("workers").once("value");
  const allWorkers = workersSnap.val() || {};
  console.log(`[DEBUG] Found ${Object.keys(allWorkers).length} workers in /workers`);

  // 2) Fetch all shifts
  const shiftsSnap = await db.ref("shifts").once("value");
  const allShifts = shiftsSnap.val() || {};
  console.log(`[DEBUG] Found ${Object.keys(allShifts).length} shifts in /shifts`);

  // Convert to arrays for iteration
  const workerEntries = Object.entries(allWorkers); // [ [workerId, {...workerData}], ... ]
  const shiftEntries = Object.entries(allShifts); // [ [shiftId, {...shiftData}], ... ]

  let assignmentsMade = 0;

  // 3) For each shift in the DB
  for (const [shiftId, shiftData] of shiftEntries) {
    console.log("----------------------------------------------");
    console.log(`[DEBUG] Checking shift "${shiftId}"...`);

    // Extract YYYY-MM-DD from shiftId => "shift_2025-01-01"
    const match = shiftId.match(/^shift_(\d{4}-\d{2}-\d{2})$/);
    if (!match) {
      console.log(`[DEBUG] Skipping shift "${shiftId}" - not named shift_YYYY-MM-DD.`);
      continue;
    }

    const shiftDateString = match[1]; // e.g. "2025-01-01"
    const shiftDate = moment(shiftDateString, "YYYY-MM-DD");
    if (!shiftDate.isValid()) {
      console.log(`[DEBUG] Skipping shift "${shiftId}" - invalid date parsed: ${shiftDateString}.`);
      continue;
    }

    // If your workers' fixed_days are in English: ["monday","tuesday"], do ".locale('en')"
    // If they're in Dutch: ["maandag","dinsdag"], do ".locale('nl')"
    const dayOfWeek = shiftDate.locale("en").format("dddd").toLowerCase();
    console.log(`[DEBUG] Shift "${shiftId}" => dayOfWeek="${dayOfWeek}"`);

    // 4) Check each worker’s fixed_days
    for (const [workerRecordId, workerData] of workerEntries) {
      console.log(`[DEBUG]   Checking worker "${workerRecordId}"...`);

      // Must have a fixed_days array
      if (!Array.isArray(workerData.fixed_days)) {
        console.log(`[DEBUG]   -> SKIP: No fixed_days found for worker "${workerRecordId}".`);
        continue;
      }

      // If dayOfWeek not in their fixed_days => skip
      if (!workerData.fixed_days.includes(dayOfWeek)) {
        console.log(`[DEBUG]   -> SKIP: dayOfWeek="${dayOfWeek}" not in [${workerData.fixed_days}].`);
        continue;
      }

      // Worker has a user_id? (the Auth UID you want in assigned_workers)
      const userAuthId = workerData.user_id;
      if (!userAuthId) {
        console.log(`[DEBUG]   -> SKIP: Worker "${workerRecordId}" has no user_id (no linked Auth user).`);
        continue;
      }

      // assigned_workers might be an array or a number
      const assignedWorkers = shiftData.assigned_workers || [];
      const assignedWorkersArray = Array.isArray(assignedWorkers) ?
        assignedWorkers :
        [];

      // Already assigned?
      if (assignedWorkersArray.includes(userAuthId)) {
        console.log(`[DEBUG]   -> SKIP: User "${userAuthId}" already assigned to shift "${shiftId}".`);
        continue;
      }

      // If we reach here => we want to assign them as a "fixed day" worker
      console.log(`[DEBUG]   => ASSIGNING user "${userAuthId}" to shift "${shiftId}" [fixed day]`);

      // Prepare updated assigned_workers
      const updatedAssignedWorkers = [...assignedWorkersArray, userAuthId];

      // Create an assignment record
      const assignmentId = `assignment_id_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // ************ THE KEY PART: fixed_day: true ************
      const assignmentData = {
        assigned_at: moment().toISOString(),
        shift_id: shiftId,
        user_id: userAuthId,
        fixed_day: true, // <--- This flags that it was assigned as a fixed day
      };

      // Multi-path update
      const updates = {};
      updates[`assignments/${assignmentId}`] = assignmentData;
      updates[`shifts/${shiftId}/assigned_workers`] = updatedAssignedWorkers;

      try {
        await db.ref().update(updates);
        assignmentsMade++;
        console.log(`[DEBUG]   -> SUCCESS: assigned user "${userAuthId}" to shift "${shiftId}" with fixed_day=true`);
      } catch (err) {
        console.error(`[ERROR]   -> FAILED to assign user "${userAuthId}" to shift "${shiftId}":`, err);
      }
    }
  }

  console.log("----------------------------------------------");
  console.log(`[DEBUG] autoAssignFixedDaysToShifts complete. Total new assignments made: ${assignmentsMade}`);
}
