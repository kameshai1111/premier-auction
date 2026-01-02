import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Player } from "../types";

export async function getPlayers(): Promise<Player[]> {
  const snapshot = await getDocs(collection(db, "players"));

  return snapshot.docs.map((doc) => doc.data() as Player);
}
