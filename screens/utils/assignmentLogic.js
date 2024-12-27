// screens/utils/assignmentLogic.js

import { get, child, ref } from 'firebase/database';
import { realtimeDB } from '../../firebaseConfig';
import { update } from 'firebase/database';

/**
 *
 * @param {Object} shifts  - The week's shifts.
 * @param {Object} users   - All users keyed by user_id.
 * @param {Object} workers - All workers keyed by workerDocId.
 *
 * @returns {Object} { pendingAssignments, workerUpdates }
 *    - pendingAssignments: { [shiftId]: [userId, userId, ...], ... }
 *    - workerUpdates: { [workerDocId]: newHours, ... }
 */
export async function assignUsersToShifts(shifts, users, workers) {
  console.log('[assignUsersToShifts] START - auto-assigning users (status only)...');

  if (!shifts || Object.keys(shifts).length === 0) {
    console.log('[assignUsersToShifts] No shifts to assign.');
    return { pendingAssignments: {}, workerUpdates: {} };
  }
  if (!users || Object.keys(users).length === 0) {
    console.log('[assignUsersToShifts] No users found.');
    return { pendingAssignments: {}, workerUpdates: {} };
  }

  // 1) Fetch all applications so we know who applied
  const appsSnap = await get(child(ref(realtimeDB), 'applications'));
  const allApplications = appsSnap.val() || {};

  // Helper to find the appId if userId applied for that shift
  function findApplicationId(shiftId, userId) {
    for (const [appId, app] of Object.entries(allApplications)) {
      // In your DB, app.worker_id is actually the userId
      if (
        app.shift_id === shiftId &&
        app.worker_id === userId &&
        app.status === 'applied'
      ) {
        return appId;
      }
    }
    return null;
  }

  // Build lists by contract priority
  const cdiUsers = [];
  const cddUsers = [];
  const studentUsers = [];

  for (const [userId, userObj] of Object.entries(users)) {
    const workerDocId = userObj.worker_id;
    if (!workerDocId || !workers[workerDocId]) continue;

    const workerData = workers[workerDocId];
    const candidate = {
      user_id: userId,
      worker_doc_id: workerDocId,
      contract_type: workerData.contract_type,
      hours_assigned: workerData.hours_assigned || 0,
      points: workerData.points || 0,
    };

    if (candidate.contract_type === 'CDI') cdiUsers.push(candidate);
    else if (candidate.contract_type === 'CDD') cddUsers.push(candidate);
    else if (candidate.contract_type === 'student') studentUsers.push(candidate);
  }

  // Optional: sort students by points
  studentUsers.sort((a, b) => (b.points || 0) - (a.points || 0));

  // We'll store which userIds we plan to assign to each shift
  const pendingAssignments = {}; // { shiftId: [ userId, ... ] }
  // We'll also store any hours updates for students
  const workerUpdates = {}; // { workerDocId: newHours, ... }

  // We'll also build an object of all the "application => status" changes
  // so we can do them in one bulk update. (Optional)
  const applicationStatusUpdates = {};

  // Helper function
  function assignFromList(list, shiftId, alreadyAssigned, newAssignments, requiredWorkers) {
    for (const candidate of list) {
      if (newAssignments.length + alreadyAssigned.length >= requiredWorkers) break;

      // skip if student over hours
      if (candidate.contract_type === 'student' && candidate.hours_assigned >= 25) {
        continue;
      }
      const appId = findApplicationId(shiftId, candidate.user_id);
      if (!appId) continue; // not applied

      // Great, we'll "assign" them in applications
      newAssignments.push(candidate.user_id);
      applicationStatusUpdates[`applications/${appId}/status`] = 'assigned';

      // If student, increment local hours so we don't double-assign them
      if (candidate.contract_type === 'student') {
        candidate.hours_assigned += 8;
        workerUpdates[candidate.worker_doc_id] = candidate.hours_assigned;
      }
    }
  }

  // 2) For each shift, pick who we *would* assign, but DON'T write to shift yet
  for (const shiftId in shifts) {
    const shift = shifts[shiftId];
    const requiredWorkers = shift.max_workers || 0;
    if (requiredWorkers === 0) continue;

    const alreadyAssigned = shift.assigned_workers || [];
    const newAssignments = [];

    // in order: CDI, CDD, student
    assignFromList(cdiUsers, shiftId, alreadyAssigned, newAssignments, requiredWorkers);
    assignFromList(cddUsers, shiftId, alreadyAssigned, newAssignments, requiredWorkers);
    assignFromList(studentUsers, shiftId, alreadyAssigned, newAssignments, requiredWorkers);

    if (!pendingAssignments[shiftId]) pendingAssignments[shiftId] = [];
    pendingAssignments[shiftId].push(...newAssignments);
  }

  // 3) Now we do a partial DB update:
  //   - Mark applications as "assigned"
  //   - Update worker hours if needed
  //   - But NOT updating shifts assigned_workers
  if (Object.keys(applicationStatusUpdates).length || Object.keys(workerUpdates).length) {
    const updates = { ...applicationStatusUpdates };
    for (const [workerDocId, newHrs] of Object.entries(workerUpdates)) {
      updates[`workers/${workerDocId}/hours_assigned`] = newHrs;
    }

    console.log('[assignUsersToShifts] Updating DB with application statuses + hours only:', updates);
    await update(ref(realtimeDB), updates);
  }

  console.log('[assignUsersToShifts] Finished partial auto-assign. No shift assignment written yet.');

  // Return the pending assignments so the "Complete" step can finalize them
  return { pendingAssignments, workerUpdates };
}
