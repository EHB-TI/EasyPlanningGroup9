import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getStartOfWeek = (referenceDate) => {
  const dayOfWeek = referenceDate.getDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export const initializeSixWeeksShifts = async () => {
  try {
    const today = new Date();
    const startOfCurrentWeek = getStartOfWeek(today);

    const shiftsToCreate = [];

    // Générer les shifts pour 6 semaines
    for (let week = 0; week < 6; week++) {
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const shiftDate = new Date(startOfCurrentWeek);
        shiftDate.setDate(shiftDate.getDate() + week * 7 + dayIndex);
        shiftDate.setHours(21, 0, 0, 0); // Heure de début 21h

        const formattedDate = shiftDate.toISOString().split('T')[0].replace(/-/g, '');
        shiftsToCreate.push({
          id: formattedDate,
          day: DAYS_OF_WEEK[dayIndex],
          date: Timestamp.fromDate(shiftDate),
          maxWorkers: 0,
          workers: 0,
          status: week < 2 ? 'unavailable' : 'available', // Les 2 premières semaines sont indisponibles
        });
      }
    }

    // Écrire dans Firestore
    const batch = shiftsToCreate.map((shift) =>
      setDoc(doc(db, `shifts/${shift.id}`), shift, { merge: true })
    );

    await Promise.all(batch);
  } catch (error) {
    console.error('Error initializing six weeks of shifts:', error);
    throw error;
  }
};

export const updateWeeklyShifts = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'shifts'));
    const shifts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Séparer les shifts par statut
    const availableShifts = shifts.filter((shift) => shift.status === 'available');
    const unavailableShifts = shifts.filter((shift) => shift.status === 'unavailable');

    // Vérifier les conditions
    if (availableShifts.length !== 4 * 7 || unavailableShifts.length !== 2 * 7) {
      console.error('Invalid shift data. Ensure 4 available weeks and 2 unavailable weeks exist.');
      return;
    }

    // Rendre la semaine "disponible" la plus ancienne indisponible
    const oldestAvailableWeek = availableShifts.slice(0, 7);
    for (const shift of oldestAvailableWeek) {
      await updateDoc(doc(db, `shifts/${shift.id}`), { status: 'unavailable' });
    }

    // Supprimer la semaine indisponible la plus ancienne
    const oldestUnavailableWeek = unavailableShifts.slice(0, 7);
    for (const shift of oldestUnavailableWeek) {
      await deleteDoc(doc(db, `shifts/${shift.id}`));
    }

    // Ajouter une nouvelle semaine disponible
    const today = new Date();
    const startOfCurrentWeek = getStartOfWeek(today);
    const startOfNewWeek = new Date(startOfCurrentWeek);
    startOfNewWeek.setDate(startOfCurrentWeek.getDate() + 6 * 7); // Déplacer à la 6ème semaine

    const newWeekShifts = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const shiftDate = new Date(startOfNewWeek);
      shiftDate.setDate(startOfNewWeek.getDate() + dayIndex);
      shiftDate.setHours(21, 0, 0, 0);

      const formattedDate = shiftDate.toISOString().split('T')[0].replace(/-/g, '');
      newWeekShifts.push({
        id: formattedDate,
        day: DAYS_OF_WEEK[dayIndex],
        date: Timestamp.fromDate(shiftDate),
        maxWorkers: 0,
        workers: 0,
        status: 'available',
      });
    }

    const batch = newWeekShifts.map((shift) =>
      setDoc(doc(db, `shifts/${shift.id}`), shift, { merge: true })
    );

    await Promise.all(batch);
  } catch (error) {
    console.error('Error updating weekly shifts:', error);
    throw error;
  }
};

export const fetchWeeklyShifts = async () => {
  const snapshot = await getDocs(collection(db, 'shifts'));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const updateShift = async (shiftId, data) => {
  const shiftRef = doc(db, 'shifts', shiftId);
  await updateDoc(shiftRef, data, { merge: true });
};
