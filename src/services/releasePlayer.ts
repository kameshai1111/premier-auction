import { doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../firebase";

export async function releasePlayerFromTeam(teamId: string, playerId: string) {
  // 1️⃣ Remove from team roster
  await updateDoc(doc(db, "teams", teamId), {
    players: arrayRemove({
      id: playerId,
    }),
  });

  // 2️⃣ RESET player state (🔥 THIS WAS MISSING)
  await updateDoc(doc(db, "players", playerId), {
    isSold: false,
    soldPrice: null,
    soldToId: null,
    soldToName: null,
  });
}
