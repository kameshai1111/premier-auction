import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Team } from "../types";

export async function createTeam(team: Team) {
  await setDoc(doc(db, "teams", team.id), {
    name: team.name,
    logoUrl: team.logo,
    color: team.color,
    initialBudget: team.initialBudget,
    remainingBudget: team.budget,
    players: [],
    playersCount: 0,
    createdAt: serverTimestamp(),
  });
}
