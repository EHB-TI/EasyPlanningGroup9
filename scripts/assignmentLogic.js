import { update, ref } from 'firebase/database';

/**
 * Assign users to shifts for the selected week.
 *
 * @param {Object} shifts - All shifts from the database.
 * @param {Object} users - All users from the database.
 * @param {Object} workers - All workers from the database.
 * @param {Object} applications - All applications from the database.
 * @param {Date} selectedWeek - Start of the selected week.
 * @param {Object} databaseRef - Firebase database reference for updates.
 * @returns {Object} { pendingAssignments }
 */
export async function assignUsersToShifts(
  shifts,
  users,
  workers,
  applications,
  selectedWeek,
  databaseRef
) {
  console.log('[assignUsersToShifts] START - Assigning for week:', selectedWeek);

  const startOfWeek = new Date(selectedWeek);
  const endOfWeek = new Date(selectedWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // End of the week (Sunday)

  const filteredShifts = Object.entries(shifts).filter(([shiftId, shift]) => {
    const shiftDate = new Date(shift.date);
    return shiftDate >= startOfWeek && shiftDate <= endOfWeek;
  });

  if (filteredShifts.length === 0) {
    console.log('[assignUsersToShifts] No shifts found for the selected week.');
    return { pendingAssignments: {} };
  }

  const pendingAssignments = {};
  const applicationStatusUpdates = {};

  for (const [shiftId, shift] of filteredShifts) {
    const requiredWorkers = shift.max_workers || 0;
    if (requiredWorkers === 0) continue;

    const shiftApplications = Object.entries(applications).filter(
      ([appId, app]) => app.shift_id === shiftId && app.status === 'applied'
    );

    if (shiftApplications.length === 0) continue;

    const sortedApplications = shiftApplications.sort(([, a], [, b]) => {
      const userA = users[a.worker_id];
      const userB = users[b.worker_id];

      // Sort by contract type (CDI > CDD > Student), then productivity
      const contractPriority = { CDI: 1, CDD: 2, Student: 3 };
      const priorityA = contractPriority[userA.contract] || 4;
      const priorityB = contractPriority[userB.contract] || 4;

      if (priorityA !== priorityB) return priorityA - priorityB;
      return (userB.productivity_last_3_months || 0) - (userA.productivity_last_3_months || 0);
    });

    const assignedUsers = sortedApplications.slice(0, requiredWorkers);

    // Record assignments and update application statuses
    pendingAssignments[shiftId] = assignedUsers.map(([appId]) => appId);

    assignedUsers.forEach(([appId, app]) => {
      // Update application status to "assigned"
      applicationStatusUpdates[`applications/${appId}/status`] = 'assigned';

      // Create a new assignment entry
      const assignmentId = `${shiftId}_${app.worker_id}`;
      applicationStatusUpdates[`assignments/${assignmentId}`] = {
        shift_id: shiftId,
        user_id: app.worker_id,
        assigned_at: new Date().toISOString(),
      };
    });
  }

  // Batch update Firebase
  await update(ref(databaseRef), applicationStatusUpdates);

  console.log('[assignUsersToShifts] Completed assignments:', pendingAssignments);

  return { pendingAssignments };
}
