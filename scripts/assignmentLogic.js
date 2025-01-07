import { update, ref, get } from 'firebase/database'; // Importer `get` pour lire les données existantes.
import { v4 as uuidv4 } from 'uuid'; // Pour générer un ID unique.

/**
 * Assign users to shifts for the selected week.
 *
 * @param {Object} shifts - All shifts from the database.
 * @param {Object} users - All users from the database.
 * @param {Object} workers - All workers from the database.
 * @param {Object} applications - All applications from the database.
 * @param {Date} selectedDate - Any date within the selected week.
 * @param {Object} databaseRef - Firebase database reference for updates.
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
  console.log('[assignUsersToShifts] START - Assigning for week:', selectedDate);

  // Calculer le lundi de la semaine
  const selectedDay = new Date(selectedDate);
  const dayOfWeek = selectedDay.getDay(); // 0 (dimanche) à 6 (samedi)
  const mondayOfWeek = new Date(selectedDay);
  mondayOfWeek.setDate(selectedDay.getDate() - ((dayOfWeek + 6) % 7)); // Ramène au lundi

  // Calculer le dimanche de la semaine
  const sundayOfWeek = new Date(mondayOfWeek);
  sundayOfWeek.setDate(mondayOfWeek.getDate() + 6); // Ajoute 6 jours pour arriver au dimanche

  console.log(`[assignUsersToShifts] Week range: ${mondayOfWeek.toISOString()} to ${sundayOfWeek.toISOString()}`);

  // Filtrer les shifts pour la semaine sélectionnée
  const filteredShifts = Object.entries(shifts).filter(([shiftId, shift]) => {
    const shiftDate = new Date(shift.date);
    return shiftDate >= mondayOfWeek && shiftDate <= sundayOfWeek;
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

      const contractPriority = { CDI: 1, CDD: 2, Student: 3 };
      const priorityA = contractPriority[userA.contract] || 4;
      const priorityB = contractPriority[userB.contract] || 4;

      if (priorityA !== priorityB) return priorityA - priorityB;
      return (userB.productivity_last_3_months || 0) - (userA.productivity_last_3_months || 0);
    });

    const assignedUsers = sortedApplications.slice(0, requiredWorkers);

    pendingAssignments[shiftId] = assignedUsers.map(([appId]) => appId);

    // Charger les assigned_workers actuels
    const shiftRef = ref(databaseRef, `shifts/${shiftId}/assigned_workers`);
    const currentAssignedWorkersSnapshot = await get(shiftRef);
    const currentAssignedWorkers = currentAssignedWorkersSnapshot.exists()
      ? currentAssignedWorkersSnapshot.val()
      : [];

    // Vérifier les doublons et ajouter uniquement les nouveaux
    const updatedAssignedWorkers = [...new Set([...currentAssignedWorkers, ...assignedUsers.map(([_, app]) => app.worker_id)])];

    assignedUsers.forEach(([appId, app]) => {
      // Update application status to "assigned"
      applicationStatusUpdates[`applications/${appId}/status`] = 'assigned';

      // Generate unique ID for assignment
      const assignmentId = uuidv4();

      // Create a new assignment entry
      applicationStatusUpdates[`assignments/${assignmentId}`] = {
        shift_id: shiftId,
        user_id: app.worker_id,
        assigned_at: new Date().toISOString(),
      };
    });

    // Mettre à jour les assigned_workers dans Firebase
    applicationStatusUpdates[`shifts/${shiftId}/assigned_workers`] = updatedAssignedWorkers;
    applicationStatusUpdates[`shifts/${shiftId}/updated_at`] = new Date().toISOString();
  }

  // Batch update Firebase
  await update(ref(databaseRef), applicationStatusUpdates);

  console.log('[assignUsersToShifts] Completed assignments:', pendingAssignments);

  return { pendingAssignments };
}
