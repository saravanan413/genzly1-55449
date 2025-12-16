import { auth } from "@/config/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

// Initialize Firebase Functions
const functions = getFunctions();

// Your Cloud Function URL (update after deployment)
const CLOUD_FUNCTION_URL = "https://us-central1-genzly.cloudfunctions.net/uploadMediaHttp";

interface UploadResult {
  success: boolean;
  url: string;
  filePath: string;
  mediaType: "image" | "video";
}

/**
 * Convert file to Base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image to JPEG with specified quality (0.9-0.95)
 */
async function compressImage(file: File, quality: number = 0.92): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      resolve(file); // Return as-is if not an image
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.src = reader.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Compression failed"));
            return;
          }
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, ".jpg"),
            { type: "image/jpeg" }
          );
          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => reject(new Error("Image load failed"));
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload media via Firebase Cloud Function (HTTP method)
 * Browser → Cloud Function → Firebase Storage
 */
export async function uploadViaCloudFunction(
  file: File,
  folder: "posts" | "stories" | "profilePictures" | "chats" | "reels",
  quality: number = 0.92
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be authenticated to upload");
  }

  console.log(`[CloudUpload] Starting upload: ${file.name} to ${folder}`);

  // Compress images (quality 0.9-0.95)
  let processedFile = file;
  if (file.type.startsWith("image/")) {
    processedFile = await compressImage(file, quality);
    console.log(`[CloudUpload] Compressed image: ${file.size} → ${processedFile.size} bytes`);
  }

  // Convert to Base64
  const base64Data = await fileToBase64(processedFile);
  console.log(`[CloudUpload] Base64 length: ${base64Data.length}`);

  // Get user's ID token for authentication
  const idToken = await user.getIdToken();

  // Call Cloud Function via HTTP
  const response = await fetch(CLOUD_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      base64Data,
      mimeType: processedFile.type,
      folder,
      fileName: `${Date.now()}_${Math.random().toString(36).substring(7)}.${processedFile.type.split("/")[1]}`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("[CloudUpload] Upload failed:", errorData);
    throw new Error(errorData.error || "Upload failed");
  }

  const result: UploadResult = await response.json();
  console.log(`[CloudUpload] Success: ${result.url}`);

  return result.url;
}

/**
 * Upload media via Firebase Callable Function
 * Alternative method using Firebase SDK's callable functions
 */
export async function uploadViaCallable(
  file: File,
  folder: "posts" | "stories" | "profilePictures" | "chats" | "reels",
  quality: number = 0.92
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be authenticated to upload");
  }

  // Compress images
  let processedFile = file;
  if (file.type.startsWith("image/")) {
    processedFile = await compressImage(file, quality);
  }

  // Convert to Base64
  const base64Data = await fileToBase64(processedFile);

  // Call the callable function
  const uploadMedia = httpsCallable<any, UploadResult>(functions, "uploadMedia");
  
  const result = await uploadMedia({
    base64Data,
    mimeType: processedFile.type,
    folder,
    fileName: `${Date.now()}.${processedFile.type.split("/")[1]}`,
  });

  return result.data.url;
}

/**
 * Upload image with default quality (0.92)
 */
export async function uploadImage(
  file: File,
  folder: "posts" | "stories" | "profilePictures" | "chats" | "reels"
): Promise<string> {
  return uploadViaCloudFunction(file, folder, 0.92);
}

/**
 * Upload video (no compression on client, handled by Cloud Function)
 */
export async function uploadVideo(
  file: File,
  folder: "posts" | "stories" | "reels"
): Promise<string> {
  return uploadViaCloudFunction(file, folder);
}

/**
 * Upload chat image
 */
export async function uploadChatImage(
  file: File,
  chatId: string,
  messageId: string
): Promise<string> {
  // For chat, we use the chats folder
  return uploadViaCloudFunction(file, "chats", 0.90);
}
