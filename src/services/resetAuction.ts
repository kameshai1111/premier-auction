import { collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

export async function resetAuction() {
  const batch = writeBatch(db);

  // 1️⃣ Reset all players
  const playersSnap = await getDocs(collection(db, "players"));
  playersSnap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      isSold: false,
      soldToId: null,
      soldToName: null,
      soldPrice: null,
    });
  });

  // 2️⃣ Reset all teams budgets
  const teamsSnap = await getDocs(collection(db, "teams"));
  teamsSnap.docs.forEach((doc) => {
    const data = doc.data();
    batch.update(doc.ref, {
      remainingBudget: data.initialBudget,
    });
  });

  await batch.commit();
}
