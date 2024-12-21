// screens/utils/assignmentLogic.js
import 'react-native-get-random-values';
import { ref, get, child, update, push } from "firebase/database";
import { realtimeDB } from "../../firebaseConfig"; // Adjust the path as necessary

/**
 * Assign users to shifts based on priority: CDI > CDD > Students (sorted by points).
 * @param {Object} shifts - The shifts to assign users to.
 * @param {Object} workers - The list of workers.
 * @returns {Promise<Object>} - Returns an object containing assignment updates and application updates.
 */
export async function assignUsersToShifts(shifts, workers) {
  // Categorize workers
  const cdiWorkers = [];
  const cddWorkers = [];
  const studentWorkers = [];

  Object.values(workers).forEach((worker) => {
    if (worker.contract_type === "CDI") {
      cdiWorkers.push(worker);
    } else if (worker.contract_type === "CDD") {
      cddWorkers.push(worker);
    } else if (worker.contract_type === "student") {
      studentWorkers.push(worker);
    }
  });

  // Sort students by points descending
  studentWorkers.sort((a, b) => (b.points || 0) - (a.points || 0));

  const assignmentsToUpdate = {};
  const applicationStatusUpdates = {};

  // Iterate over each shift to assign workers
  for (const shiftId in shifts) {
    const shift = shifts[shiftId];
    const requiredWorkers = shift.max_workers;

    if (requiredWorkers === 0) continue; // Skip if no workers needed

    const alreadyAssigned = shift.assigned_workers || [];
    const availableCDI = cdiWorkers.filter(
      (w) => !alreadyAssigned.includes(w.worker_id)
    );
    const availableCDD = cddWorkers.filter(
      (w) => !alreadyAssigned.includes(w.worker_id)
    );
    const availableStudents = studentWorkers.filter(
      (w) => !alreadyAssigned.includes(w.worker_id) && (w.hours_assigned || 0) < 25
    );

    const newAssignments = [];

    // Helper function to assign workers from a list
    const assignFromList = (workerList, maxAssign) => {
      for (const worker of workerList) {
        if (newAssignments.length >= maxAssign) break;
        newAssignments.push(worker.worker_id);

        // If student, update hours_assigned
        if (worker.contract_type === "student") {
          worker.hours_assigned = (worker.hours_assigned || 0) + 8; // Assuming 8-hour shifts
        }
      }
    };

    // Assign CDI workers first
    assignFromList(availableCDI, requiredWorkers - newAssignments.length);

    // Assign CDD workers next
    if (newAssignments.length < requiredWorkers) {
      assignFromList(
        availableCDD,
        requiredWorkers - newAssignments.length
      );
    }

    // Assign Students based on points
    if (newAssignments.length < requiredWorkers) {
      assignFromList(
        availableStudents,
        requiredWorkers - newAssignments.length
      );
    }

    // Combine already assigned workers with new assignments
    const totalAssigned = [...alreadyAssigned, ...newAssignments];

    // Prepare the update for assigned_workers
    assignmentsToUpdate[`shifts/${shiftId}/assigned_workers`] = totalAssigned;

    // Create assignment records and prepare application status updates
    for (const workerId of newAssignments) {
      const assignmentRef = push(ref(realtimeDB, "assignments"));
      assignmentsToUpdate[`assignments/${assignmentRef.key}`] = {
        assigned_at: new Date().toISOString(),
        shift_id: shiftId,
        user_id: workerId,
      };

      // Find the corresponding application to update its status
      // Assuming one application per worker per shift
      const applicationsSnapshot = await get(
        child(ref(realtimeDB), "applications")
      );
      const applications = applicationsSnapshot.val() || {};

      for (const appId in applications) {
        const app = applications[appId];
        if (
          app.worker_id === workerId &&
          app.shift_id === shiftId &&
          app.status === "applied"
        ) {
          applicationStatusUpdates[`applications/${appId}/status`] = "assigned";
          break; // Assuming only one relevant application per worker per shift
        }
      }
    }
  }

  // Combine all updates
  const allUpdates = { ...assignmentsToUpdate, ...applicationStatusUpdates };

  // Perform the updates in Firebase
  await update(ref(realtimeDB), allUpdates);

  return allUpdates; // Optional: Return the updates for confirmation
}
