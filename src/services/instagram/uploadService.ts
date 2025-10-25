/**
 * Instagram-Style Upload Service
 * 
 * Handles all media uploads with:
 * - Direct uploadBytesResumable to Firebase Storage
 * - Real-time progress tracking
 * - Automatic retry with exponential backoff
 * - Proper file naming: {type}_{timestamp}.{ext}
 * - Metadata saving to Firestore
 */

import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db, auth } from '@/config/firebase';
import { prepareMediaForUpload, getVideoDuration } from './compressionService';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  maxRetries?: number;
}

export interface UploadResult {
  downloadURL: string;
  thumbnailURL?: string;
  postId?: string;
}

/**
 * Upload file to Firebase Storage with progress and retry logic
 */
const uploadToStorage = async (
  file: File,
  storagePath: string,
  options: UploadOptions = {}
): Promise<string> => {
  const { onProgress, maxRetries = 3 } = options;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await new Promise<string>((resolve, reject) => {
        const storageRef = ref(storage, storagePath);
        
        console.log(`📤 Upload attempt ${attempt + 1}/${maxRetries}:`, {
          path: storagePath,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          type: file.type
        });

        const uploadTask: UploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type,
          customMetadata: {
            uploadedAt: new Date().toISOString(),
            originalSize: file.size.toString()
          }
        });

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            };
            
            onProgress?.(progress);
          },
          (error) => {
            console.error(`❌ Upload attempt ${attempt + 1} failed:`, error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('✅ Upload successful:', downloadURL);
              resolve(downloadURL);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      attempt++;
      
      if (attempt >= maxRetries) {
        console.error('❌ Upload failed after max retries');
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Upload failed');
};

/**
 * Upload Profile Picture
 */
export const uploadProfilePicture = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  console.log('📸 Uploading profile picture...');

  // Compress image
  const { main: compressed } = await prepareMediaForUpload(file, 'image');

  // Upload to: profilePictures/{userId}/profile_{timestamp}.jpg
  const timestamp = Date.now();
  const storagePath = `profilePictures/${currentUser.uid}/profile_${timestamp}.jpg`;

  const downloadURL = await uploadToStorage(compressed, storagePath, {
    onProgress: (p) => onProgress?.(p.progress)
  });

  // Update user document
  await updateDoc(doc(db, 'users', currentUser.uid), {
    avatar: downloadURL,
    updatedAt: serverTimestamp()
  });

  return downloadURL;
};

/**
 * Upload Post (Photo)
 */
export const uploadPost = async (
  file: File,
  caption: string,
  settings: { allowComments: boolean; hideLikeCount: boolean } = {
    allowComments: true,
    hideLikeCount: false
  },
  onProgress?: (stage: string, progress: number) => void
): Promise<UploadResult> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  console.log('📷 Creating post...');

  // Prepare media
  onProgress?.('preparing', 0);
  const { main, thumbnail } = await prepareMediaForUpload(file, 'image');
  onProgress?.('preparing', 100);

  // Upload main image to: posts/{userId}/post_{timestamp}.jpg
  const timestamp = Date.now();
  const mainPath = `posts/${currentUser.uid}/post_${timestamp}.jpg`;
  
  onProgress?.('uploading', 0);
  const downloadURL = await uploadToStorage(main, mainPath, {
    onProgress: (p) => onProgress?.('uploading', p.progress)
  });

  // Upload thumbnail
  const thumbPath = `posts/${currentUser.uid}/post_${timestamp}_thumb.jpg`;
  const thumbnailURL = await uploadToStorage(thumbnail, thumbPath);

  // Save metadata to Firestore
  onProgress?.('saving', 0);
  const postDoc = await addDoc(collection(db, 'posts'), {
    userId: currentUser.uid,
    caption,
    mediaURL: downloadURL,
    thumbnailURL,
    mediaType: 'image',
    timestamp: serverTimestamp(),
    likes: 0,
    likedBy: [],
    allowComments: settings.allowComments,
    hideLikeCount: settings.hideLikeCount
  });
  onProgress?.('saving', 100);

  console.log('✅ Post created:', postDoc.id);

  return { downloadURL, thumbnailURL, postId: postDoc.id };
};

/**
 * Upload Reel (Video)
 */
export const uploadReel = async (
  file: File,
  caption: string,
  settings: { allowComments: boolean; hideLikeCount: boolean } = {
    allowComments: true,
    hideLikeCount: false
  },
  onProgress?: (stage: string, progress: number) => void
): Promise<UploadResult> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  console.log('🎬 Creating reel...');

  // Get video duration
  const duration = await getVideoDuration(file);

  // Prepare media (generates thumbnail)
  onProgress?.('preparing', 0);
  const { main, thumbnail } = await prepareMediaForUpload(file, 'video');
  onProgress?.('preparing', 100);

  // Upload video to: reels/{userId}/reel_{timestamp}.mp4
  const timestamp = Date.now();
  const videoPath = `reels/${currentUser.uid}/reel_${timestamp}.mp4`;
  
  onProgress?.('uploading', 0);
  const downloadURL = await uploadToStorage(main, videoPath, {
    onProgress: (p) => onProgress?.('uploading', p.progress)
  });

  // Upload thumbnail
  const thumbPath = `reels/${currentUser.uid}/reel_${timestamp}_thumb.jpg`;
  const thumbnailURL = await uploadToStorage(thumbnail, thumbPath);

  // Save metadata to Firestore
  onProgress?.('saving', 0);
  const reelDoc = await addDoc(collection(db, 'reels'), {
    userId: currentUser.uid,
    caption,
    videoUrl: downloadURL,
    mediaURL: downloadURL,
    thumbnailURL,
    mediaType: 'video',
    duration,
    timestamp: serverTimestamp(),
    likes: 0,
    likedBy: [],
    allowComments: settings.allowComments,
    hideLikeCount: settings.hideLikeCount
  });
  onProgress?.('saving', 100);

  console.log('✅ Reel created:', reelDoc.id);

  return { downloadURL, thumbnailURL, postId: reelDoc.id };
};

/**
 * Upload Story
 */
export const uploadStory = async (
  file: File,
  mediaType: 'image' | 'video',
  onProgress?: (stage: string, progress: number) => void
): Promise<UploadResult> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  console.log('📖 Creating story...');

  // Prepare media
  onProgress?.('preparing', 0);
  const { main, thumbnail } = await prepareMediaForUpload(file, mediaType);
  onProgress?.('preparing', 100);

  // Upload to: stories/{userId}/story_{timestamp}.{ext}
  const timestamp = Date.now();
  const ext = mediaType === 'video' ? 'mp4' : 'jpg';
  const mainPath = `stories/${currentUser.uid}/story_${timestamp}.${ext}`;
  
  onProgress?.('uploading', 0);
  const downloadURL = await uploadToStorage(main, mainPath, {
    onProgress: (p) => onProgress?.('uploading', p.progress)
  });

  // Upload thumbnail
  const thumbPath = `stories/${currentUser.uid}/story_${timestamp}_thumb.jpg`;
  const thumbnailURL = await uploadToStorage(thumbnail, thumbPath);

  // Get duration for videos
  let duration;
  if (mediaType === 'video') {
    duration = await getVideoDuration(file);
  }

  // Save metadata to Firestore
  onProgress?.('saving', 0);
  const storyDoc = await addDoc(collection(db, 'stories'), {
    userId: currentUser.uid,
    mediaURL: downloadURL,
    thumbnailURL,
    mediaType,
    duration,
    timestamp: serverTimestamp(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    views: []
  });
  onProgress?.('saving', 100);

  console.log('✅ Story created:', storyDoc.id);

  return { downloadURL, thumbnailURL, postId: storyDoc.id };
};

/**
 * Upload Chat Media
 */
export const uploadChatMedia = async (
  file: File,
  chatId: string,
  messageId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  console.log('💬 Uploading chat media...');

  const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

  // Compress media
  const { main } = await prepareMediaForUpload(file, mediaType);

  // Upload to: chats/{chatId}/{messageId}/media_{timestamp}.{ext}
  const timestamp = Date.now();
  const ext = mediaType === 'video' ? 'mp4' : 'jpg';
  const storagePath = `chats/${chatId}/${messageId}/media_${timestamp}.${ext}`;

  const downloadURL = await uploadToStorage(main, storagePath, {
    onProgress: (p) => onProgress?.(p.progress)
  });

  console.log('✅ Chat media uploaded');

  return downloadURL;
};
