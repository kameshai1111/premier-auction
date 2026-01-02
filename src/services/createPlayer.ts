import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Player } from "../types";

export async function createPlayer(player: Player) {
  await setDoc(doc(db, "players", player.id), {
    id: player.id,
    name: player.name,
    club: player.club,
    type: player.type,
    basePrice: player.basePrice,
    rating: player.rating,
    image: player.image,
    isSold: player.isSold,
  });
}
