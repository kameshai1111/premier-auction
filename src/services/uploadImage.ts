import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadImage(file: File) {
  const storage = getStorage();

  const imageRef = ref(storage, `players/${Date.now()}-${file.name}`);

  await uploadBytes(imageRef, file);
  return await getDownloadURL(imageRef);
}
