import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Team } from "../types";

export async function getTeams(): Promise<Team[]> {
  const snapshot = await getDocs(collection(db, "teams"));

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      name: data.name,
      logo: data.logoUrl,
      color: data.color,
      initialBudget: data.initialBudget,

      // ⛔ DO NOT trust stored values
      budget: data.initialBudget,
      players: [],
    };
  });
}
