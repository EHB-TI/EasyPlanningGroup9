// assignmentLogic.js

import { update, ref, get } from 'firebase/database'; // Import `get` voor het lezen van bestaande data
import { v4 as uuidv4 } from 'uuid'; // Voor het genereren van unieke IDs
import { parseISO, isValid, startOfWeek, endOfWeek } from 'date-fns';

/**
 * Assign users to shifts for the selected week without exceeding max_workers.
 *
 * @param {Object} shifts - Alle shifts uit de database.
 * @param {Object} users - Alle users uit de database.
 * @param {Object} workers - Alle workers uit de database.
 * @param {Object} applications - Alle applications uit de database.
 * @param {String} selectedDate - Elke datum binnen de geselecteerde week in 'yyyy-MM-dd' formaat.
 * @param {Object} databaseRef - Firebase database referentie voor updates.
 * @returns {Object} { pendingAssignments }
 */
export async function assignUsersToShifts(
  shifts,
  users,
  workers,
  applications,
  selectedDate,
  databaseRef
) {
  console.log('[assignUsersToShifts] START');
  console.log('[assignUsersToShifts] Shifts:', shifts);
  console.log('[assignUsersToShifts] Users:', users);
  console.log('[assignUsersToShifts] Workers:', workers);
  console.log('[assignUsersToShifts] Applications:', applications);
  console.log('[assignUsersToShifts] Selected Date:', selectedDate);

  try {
    // Parse selectedDate
    const selectedDay = parseISO(selectedDate);
    if (!isValid(selectedDay)) {
      throw new RangeError(`Invalid selectedDate: ${selectedDate}`);
    }

    // Calculate Monday and Sunday of the selected week
    const mondayOfWeek = startOfWeek(selectedDay, { weekStartsOn: 1 }); // Maandag als eerste dag
    const sundayOfWeek = endOfWeek(selectedDay, { weekStartsOn: 1 }); // Zondag als laatste dag

    console.log(
      `[assignUsersToShifts] Week range: ${mondayOfWeek.toISOString()} to ${sundayOfWeek.toISOString()}`
    );

    // Filter shifts voor de geselecteerde week en sluit gesloten shifts uit
    const filteredShifts = Object.entries(shifts).filter(([shiftId, shift]) => {
      const shiftDate = parseISO(shift.date);
      if (!isValid(shiftDate)) {
        console.error(`[assignUsersToShifts] Invalid date for shift ${shiftId}: ${shift.date}`);
        return false;
      }
      return shiftDate >= mondayOfWeek && shiftDate <= sundayOfWeek && shift.status !== 'closed';
    });

    console.log(`[assignUsersToShifts] Found ${filteredShifts.length} valid shifts for the week.`);

    if (filteredShifts.length === 0) {
      console.log('[assignUsersToShifts] No shifts found for the selected week.');
      return { pendingAssignments: {} };
    }

    const pendingAssignments = {};
    const applicationStatusUpdates = {};

    for (const [shiftId, shift] of filteredShifts) {
      console.log(`[assignUsersToShifts] Processing shift ${shiftId} on ${shift.date}`);

      const requiredWorkers = shift.max_workers || 0;
      if (requiredWorkers === 0) {
        console.log(`[assignUsersToShifts] Shift ${shiftId} has no required workers. Skipping.`);
        continue;
      }

      // Haal huidige toegewezen workers op
      const shiftRef = ref(databaseRef, `shifts/${shiftId}/assigned_workers`);
      const currentAssignedWorkersSnapshot = await get(shiftRef);
      const currentAssignedWorkers = currentAssignedWorkersSnapshot.exists()
        ? currentAssignedWorkersSnapshot.val()
        : [];

      console.log(`[assignUsersToShifts] Current assigned workers for shift ${shiftId}:`, currentAssignedWorkers);

      // Bereken beschikbare slots
      const availableWorkers = requiredWorkers - currentAssignedWorkers.length;
      if (availableWorkers <= 0) {
        console.log(`[assignUsersToShifts] Shift ${shiftId} is already full. Skipping.`);
        continue;
      }

      console.log(`[assignUsersToShifts] Available slots for shift ${shiftId}: ${availableWorkers}`);

      // Filter applications voor de huidige shift met status 'applied'
      const shiftApplications = Object.entries(applications).filter(
        ([appId, app]) => app.shift_id === shiftId && app.status === 'applied'
      );

      console.log(`[assignUsersToShifts] Found ${shiftApplications.length} applied applications for shift ${shiftId}.`);

      if (shiftApplications.length === 0) {
        console.log(`[assignUsersToShifts] No applied applications for shift ${shiftId}. Skipping.`);
        continue;
      }

      // Sorteer applications op basis van contractprioriteit en productiviteit
      const sortedApplications = shiftApplications.sort(([, a], [, b]) => {
        const userA = users[a.worker_id];
        const userB = users[b.worker_id];

        if (!userA || !userB) {
          console.warn(`[assignUsersToShifts] Missing user data for application comparison. AppA: ${a.worker_id}, AppB: ${b.worker_id}`);
          return 0;
        }

        const contractPriority = { CDI: 1, CDD: 2, Student: 3 };
        const priorityA = contractPriority[userA.contract] || 4;
        const priorityB = contractPriority[userB.contract] || 4;

        if (priorityA !== priorityB) return priorityA - priorityB;
        return (userB.productivity_last_3_months || 0) - (userA.productivity_last_3_months || 0);
      });

      console.log(`[assignUsersToShifts] Applications sorted for shift ${shiftId}.`);

      // Wijs alleen toe tot het beschikbare aantal slots
      const assignedUsers = sortedApplications.slice(0, availableWorkers);
      pendingAssignments[shiftId] = assignedUsers.map(([appId]) => appId);

      console.log(`[assignUsersToShifts] Assigning ${assignedUsers.length} users to shift ${shiftId}.`);

      // Update assigned_workers zonder duplicaten
      const updatedAssignedWorkers = [
        ...new Set([
          ...currentAssignedWorkers,
          ...assignedUsers.map(([_, app]) => app.worker_id),
        ]),
      ];

      console.log(`[assignUsersToShifts] Updated assigned workers for shift ${shiftId}:`, updatedAssignedWorkers);

      assignedUsers.forEach(([appId, app]) => {
        // Update application status naar "assigned"
        applicationStatusUpdates[`applications/${appId}/status`] = 'assigned';

        // Genereer unieke ID voor assignment
        const assignmentId = uuidv4();

        // Maak een nieuwe assignment entry aan
        applicationStatusUpdates[`assignments/${assignmentId}`] = {
          assigned_at: new Date().toISOString(),
          shift_id: shiftId,
          user_id: app.worker_id,
        };

        console.log(`[assignUsersToShifts] Created assignment ${assignmentId} for user ${app.worker_id} on shift ${shiftId}.`);
      });

      // Update assigned_workers en updated_at in shifts
      applicationStatusUpdates[`shifts/${shiftId}/assigned_workers`] = updatedAssignedWorkers;
      applicationStatusUpdates[`shifts/${shiftId}/updated_at`] = new Date().toISOString();
      console.log(`[assignUsersToShifts] Prepared updates for shift ${shiftId}.`);
    }

    // Batch update Firebase
    console.log('[assignUsersToShifts] Committing batch updates to Firebase...');
    await update(ref(databaseRef), applicationStatusUpdates);
    console.log('[assignUsersToShifts] Batch updates committed successfully.');

    console.log('[assignUsersToShifts] Completed assignments:', pendingAssignments);

    return { pendingAssignments };
  } catch (error) {
    console.error('[assignUsersToShifts] Error:', error);
    throw error; // Propagate the error to be handled by the caller
  }
}

/**
 * Helper function to validate date strings.
 *
 * @param {String} dateString - Date string to validate.
 * @returns {Boolean} - True if valid, false otherwise.
 */
function isValidDate(dateString) {
  const date = parseISO(dateString);
  return isValid(date);
}
