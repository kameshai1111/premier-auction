import { doc, updateDoc, arrayUnion, increment } from "firebase/firestore";
import { db } from "../firebase";

export async function updateTeamAfterSale(
  teamId: string,
  playerId: string,
  soldPrice: number
) {
  await updateDoc(doc(db, "teams", teamId), {
    players: arrayUnion(playerId), // ✅ ONLY ID
    playersCount: increment(1),
    remainingBudget: increment(-soldPrice),
  });
}
