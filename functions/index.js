const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

const bucket = admin.storage().bucket();
const db = admin.firestore();

/**
 * HTTPS Callable Function: uploadMedia
 * Handles both image and video uploads from browser → Cloud Function → Storage
 */
exports.uploadMedia = functions.https.onCall(async (data, context) => {
  // 1. Security: Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to upload files."
    );
  }

  const userId = context.auth.uid;
  const { base64Data, mimeType, folder, fileName } = data;

  // 2. Validate input data
  if (!base64Data || typeof base64Data !== "string" || base64Data.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Base64 data is required and must be a non-empty string."
    );
  }

  if (!mimeType || typeof mimeType !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "MIME type is required."
    );
  }

  const validFolders = ["posts", "stories", "profilePictures", "chats", "reels"];
  if (!folder || !validFolders.includes(folder)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Folder must be one of: ${validFolders.join(", ")}`
    );
  }

  // Validate MIME type
  const validImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const validVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
  const isImage = validImageTypes.includes(mimeType);
  const isVideo = validVideoTypes.includes(mimeType);

  if (!isImage && !isVideo) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid file type. Supported: JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV"
    );
  }

  try {
    // 3. Convert Base64 to Buffer
    const buffer = Buffer.from(base64Data, "base64");

    // File size validation (50MB max for videos, 10MB for images)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `File too large. Max: ${isVideo ? "50MB" : "10MB"}`
      );
    }

    // 4. Define storage path
    const extension = mimeType.split("/")[1].replace("quicktime", "mov");
    const uniqueFileName = fileName || `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    const filePath = `${folder}/${userId}/${uniqueFileName}`;

    // 5. Upload to Firebase Storage using Admin SDK
    const file = bucket.file(filePath);
    
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          originalFileName: fileName || "unknown",
        },
      },
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // 6. Log to Firestore for posts/reels
    if (folder === "posts" || folder === "reels") {
      await db.collection("posts").add({
        userId: userId,
        [isVideo ? "videoUrl" : "imageUrl"]: publicUrl,
        mediaType: isVideo ? "video" : "image",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: "processing",
        folder: folder,
      });
    }

    console.log(`Successfully uploaded ${filePath} for user ${userId}`);

    return {
      success: true,
      url: publicUrl,
      filePath: filePath,
      mediaType: isVideo ? "video" : "image",
    };

  } catch (error) {
    console.error("Upload error:", error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      "internal",
      "Failed to upload file. Please try again."
    );
  }
});

/**
 * HTTPS Request Function: uploadMediaHttp
 * Alternative HTTP endpoint for direct fetch calls
 */
exports.uploadMediaHttp = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Only allow POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      // Verify Firebase ID token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: Missing token" });
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      const { base64Data, mimeType, folder, fileName } = req.body;

      // Validate inputs
      if (!base64Data || !mimeType || !folder) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const validFolders = ["posts", "stories", "profilePictures", "chats", "reels"];
      if (!validFolders.includes(folder)) {
        return res.status(400).json({ error: "Invalid folder" });
      }

      // Convert and upload
      const buffer = Buffer.from(base64Data, "base64");
      const extension = mimeType.split("/")[1].replace("quicktime", "mov");
      const uniqueFileName = fileName || `${Date.now()}.${extension}`;
      const filePath = `${folder}/${userId}/${uniqueFileName}`;

      const file = bucket.file(filePath);
      await file.save(buffer, {
        metadata: { contentType: mimeType },
      });
      await file.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      return res.status(200).json({
        success: true,
        url: publicUrl,
        filePath: filePath,
      });

    } catch (error) {
      console.error("HTTP Upload error:", error);
      return res.status(500).json({ error: "Upload failed" });
    }
  });
});
