import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function deleteTeam(teamId: string) {
  await deleteDoc(doc(db, "teams", teamId));
}
