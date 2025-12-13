import { getAuth } from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "firebase/storage";

/**
 * Convert any image to JPG with 0.95 quality
 */
export function convertImageToJpg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("File is not an image"));
    }

    const reader = new FileReader();
    const img = new Image();

    reader.onload = () => {
      img.src = reader.result as string;
    };

    reader.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context not available"));
      
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("JPG conversion failed"));

          const jpgFile = new File(
            [blob],
            `${Date.now()}.jpg`,
            { type: "image/jpeg" }
          );

          resolve(jpgFile);
        },
        "image/jpeg",
        0.95
      );
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Upload image for profile, post, story
 * Paths:
 * - profilePictures/{uid}/{fileName}
 * - posts/{uid}/{fileName}
 * - stories/{uid}/{fileName}
 */
export async function uploadImage({ 
  file, 
  folder 
}: { 
  file: File; 
  folder: "profilePictures" | "posts" | "stories";
}): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) throw new Error("User not authenticated");

  const jpgFile = await convertImageToJpg(file);

  const storage = getStorage();
  const path = `${folder}/${user.uid}/${jpgFile.name}`;
  const storageRef = ref(storage, path);

  const uploadTask = uploadBytesResumable(storageRef, jpgFile);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null,
      reject,
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
}

/**
 * Upload image in chat
 * Path: chats/{chatId}/{messageId}/{fileName}
 */
export async function uploadChatImage(
  file: File, 
  chatId: string, 
  messageId: string
): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) throw new Error("User not authenticated");

  const jpgFile = await convertImageToJpg(file);

  const storage = getStorage();
  const path = `chats/${chatId}/${messageId}/${jpgFile.name}`;
  const storageRef = ref(storage, path);

  const uploadTask = uploadBytesResumable(storageRef, jpgFile);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null,
      reject,
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
}
