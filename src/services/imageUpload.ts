import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "firebase/storage";
import { storage } from "@/config/firebase";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Build storage path using the required folder structure:
 * {folder}/{uid}/{filename}
 */
function buildUploadPath(folder: "profilePictures" | "posts" | "stories" | "reels", uid: string, fileName: string): string {
  return `${folder}/${uid}/${fileName}`;
}

/**
 * Convert any image to JPG with specified quality
 */
export function convertImageToJpg(file: File, quality: number = 0.92): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Invalid image file"));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }
        
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("JPEG conversion failed"));
              return;
            }

            const jpgFile = new File(
              [blob],
              `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`,
              { type: "image/jpeg" }
            );

            resolve(jpgFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => reject(new Error("Image load error"));
      img.src = reader.result as string;
    };

    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload image/video to Firebase Storage
 * Required paths:
 * - posts/{uid}/{filename}
 * - reels/{uid}/{filename}
 * - stories/{uid}/{filename}
 * - profilePictures/{uid}/{filename}
 */
export async function uploadImage({
  file,
  folder,
  uid,
  onProgress
}: {
  file: File;
  folder: "profilePictures" | "posts" | "stories" | "reels";
  uid: string;
  onProgress?: (percent: number) => void;
}): Promise<string> {
  if (!uid) throw new Error("User UID is required for upload");
  if (file.size > MAX_FILE_SIZE) throw new Error("File exceeds 100MB limit");

  let uploadFile: File;

  if (file.type.startsWith("image/")) {
    uploadFile = await convertImageToJpg(file);
  } else {
    const ext = file.name.split(".").pop() || "mp4";
    uploadFile = new File(
      [file],
      `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`,
      { type: file.type }
    );
  }

  const path = buildUploadPath(folder, uid, uploadFile.name);
  console.log("[Upload] Current user uid:", uid);
  console.log("[Upload] Uploading to path:", path);

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, uploadFile);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(percent);
      },
      reject,
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
}
