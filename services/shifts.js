import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const initializeShifts = async () => {
  const now = new Date();
  const startOfWeek = new Date(now);
  const sundayAdjustment = now.getDay() === 0 ? -7 : -now.getDay();
  startOfWeek.setDate(now.getDate() + sundayAdjustment + 1); // Start from the upcoming Monday
  startOfWeek.setHours(0, 0, 0, 0);

  for (let weekOffset = 0; weekOffset < 6; weekOffset++) {
    const baseDate = new Date(startOfWeek);
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);

    const isAvailable = weekOffset >= 2; // First 2 weeks are "not available"; the next 4 weeks are "available"
    for (let dayIndex = 0; dayIndex < DAYS_OF_WEEK.length; dayIndex++) {
      const currentDay = new Date(baseDate);
      currentDay.setDate(baseDate.getDate() + dayIndex);
      currentDay.setHours(21, 0, 0, 0);

      const formattedDate = currentDay.toISOString().split('T')[0].replace(/-/g, '');
      const shiftRef = doc(db, `shifts/${formattedDate}`);

      await setDoc(
        shiftRef,
        {
          id: formattedDate,
          day: DAYS_OF_WEEK[dayIndex],
          date: Timestamp.fromDate(currentDay),
          maxWorkers: 0, // Default maxWorkers is 0
          workers: 0,    // Default workers is 0
          status: isAvailable ? 'available' : 'not_available',
        },
        { merge: true }
      );
    }
  }

  // Clean up old shifts
  const allShifts = await getDocs(collection(db, 'shifts'));
  const nowTimestamp = Timestamp.fromDate(now);
  const cleanupPromises = [];
  allShifts.docs.forEach((shiftDoc) => {
    const shiftData = shiftDoc.data();
    if (shiftData.date.toDate() < nowTimestamp.toDate()) {
      cleanupPromises.push(deleteDoc(shiftDoc.ref));
    }
  });
  await Promise.all(cleanupPromises);
};

export const fetchShifts = async () => {
  const snapshot = await getDocs(collection(db, 'shifts'));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const updateShift = async (shiftId, data) => {
  const shiftRef = doc(db, 'shifts', shiftId);
  await updateDoc(shiftRef, data, { merge: true });
};
