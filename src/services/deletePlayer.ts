import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function deletePlayer(playerId: string) {
  await deleteDoc(doc(db, "players", playerId));
}
