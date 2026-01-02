import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Marks a player as SOLD in Firestore
 */
export async function markPlayerSold(
  playerId: string,
  teamId: string,
  teamName: string,
  soldPrice: number
) {
  const playerRef = doc(db, "players", playerId);

  await updateDoc(playerRef, {
    isSold: true,
    soldToId: teamId,
    soldToName: teamName,
    soldPrice: soldPrice,
  });
}
