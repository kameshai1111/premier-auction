import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

export async function uploadTeamLogo(file: File, teamId: string) {
  const logoRef = ref(storage, `teams/${teamId}.png`);

  await uploadBytes(logoRef, file);

  return await getDownloadURL(logoRef);
}
