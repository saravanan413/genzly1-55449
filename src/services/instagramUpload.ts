import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db, auth } from '../config/firebase';

/**
 * Instagram-style direct upload to Firebase Storage
 * Simple, clean, no complex network awareness - just direct uploadBytesResumable
 */

interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

interface UploadResult {
  downloadURL: string;
  postId: string;
}

/**
 * Upload media directly to Firebase Storage with real-time progress
 * Exactly like Instagram - direct device upload using user's internet
 */
export const uploadMediaToStorage = async (
  file: File,
  storagePath: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create storage reference
    const storageRef = ref(storage, storagePath);
    
    console.log('📤 Starting Instagram-style upload:', {
      path: storagePath,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type
    });

    // Start resumable upload
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        originalSize: file.size.toString()
      }
    });

    // Monitor upload progress
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = {
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        };
        
        console.log(`📊 Upload progress: ${progress.progress.toFixed(1)}%`, {
          transferred: `${(progress.bytesTransferred / 1024 / 1024).toFixed(2)} MB`,
          total: `${(progress.totalBytes / 1024 / 1024).toFixed(2)} MB`
        });
        
        onProgress?.(progress);
      },
      (error) => {
        console.error('❌ Upload error (DETAILED - Check for CORS issues):', {
          code: error.code,
          message: error.message,
          serverResponse: error.serverResponse,
          customData: error.customData,
          name: error.name,
          diagnosticHint: error.code === 'storage/unauthorized' 
            ? '🚨 MOST LIKELY CORS ISSUE: Bucket needs CORS config with x-goog-upload-* headers for your origin. Check Network tab for failed OPTIONS request.'
            : error.code === 'storage/unauthenticated'
            ? 'User not authenticated'
            : 'Check Network tab in DevTools for more details'
        });
        reject(error);
      },
      async () => {
        // Upload complete - get download URL
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('✅ Upload complete! URL:', downloadURL);
          resolve(downloadURL);
        } catch (error) {
          console.error('❌ Failed to get download URL:', error);
          reject(error);
        }
      }
    );
  });
};

/**
 * Create a post (photo) with Instagram-style upload
 */
export const createInstagramPost = async (
  file: File,
  caption: string,
  settings: { allowComments: boolean; hideLikeCount: boolean } = { allowComments: true, hideLikeCount: false },
  onProgress?: (progress: number) => void
): Promise<UploadResult> => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('User must be authenticated to upload');
  }

  console.log('🚀 Creating Instagram-style post:', {
    userId: currentUser.uid,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    caption: caption.substring(0, 50) + (caption.length > 50 ? '...' : '')
  });

  // Generate unique filename
  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name}`;
  const storagePath = `posts/${currentUser.uid}/${fileName}`;

  // Upload media to storage with progress tracking
  const downloadURL = await uploadMediaToStorage(
    file,
    storagePath,
    (progress) => onProgress?.(progress.progress)
  );

  // Save post metadata to Firestore
  console.log('💾 Saving post to Firestore...');
  const postsRef = collection(db, 'posts');
  const postDoc = await addDoc(postsRef, {
    userId: currentUser.uid,
    caption,
    mediaURL: downloadURL,
    mediaType: 'image',
    timestamp: serverTimestamp(),
    likes: 0,
    likedBy: [],
    allowComments: settings.allowComments,
    hideLikeCount: settings.hideLikeCount
  });

  console.log('🎉 Post created successfully! ID:', postDoc.id);

  return {
    downloadURL,
    postId: postDoc.id
  };
};

/**
 * Create a reel (video) with Instagram-style upload
 */
export const createInstagramReel = async (
  file: File,
  caption: string,
  settings: { allowComments: boolean; hideLikeCount: boolean } = { allowComments: true, hideLikeCount: false },
  onProgress?: (progress: number) => void
): Promise<UploadResult> => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('User must be authenticated to upload');
  }

  console.log('🚀 Creating Instagram-style reel:', {
    userId: currentUser.uid,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    caption: caption.substring(0, 50) + (caption.length > 50 ? '...' : '')
  });

  // Generate unique filename
  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name}`;
  const storagePath = `reels/${currentUser.uid}/${fileName}`;

  // Upload video to storage with progress tracking
  const downloadURL = await uploadMediaToStorage(
    file,
    storagePath,
    (progress) => onProgress?.(progress.progress)
  );

  // Save reel metadata to Firestore
  console.log('💾 Saving reel to Firestore...');
  const reelsRef = collection(db, 'reels');
  const reelDoc = await addDoc(reelsRef, {
    userId: currentUser.uid,
    caption,
    videoUrl: downloadURL,
    mediaURL: downloadURL,
    mediaType: 'video',
    timestamp: serverTimestamp(),
    likes: 0,
    likedBy: [],
    allowComments: settings.allowComments,
    hideLikeCount: settings.hideLikeCount
  });

  console.log('🎉 Reel created successfully! ID:', reelDoc.id);

  return {
    downloadURL,
    postId: reelDoc.id
  };
};

/**
 * Create a story with Instagram-style upload
 */
export const createInstagramStory = async (
  file: File,
  mediaType: 'image' | 'video',
  onProgress?: (progress: number) => void
): Promise<UploadResult> => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('User must be authenticated to upload');
  }

  console.log('🚀 Creating Instagram-style story:', {
    userId: currentUser.uid,
    mediaType,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`
  });

  // Generate unique filename
  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name}`;
  const storagePath = `stories/${currentUser.uid}/${fileName}`;

  // Upload media to storage with progress tracking
  const downloadURL = await uploadMediaToStorage(
    file,
    storagePath,
    (progress) => onProgress?.(progress.progress)
  );

  // Save story metadata to Firestore
  console.log('💾 Saving story to Firestore...');
  const storiesRef = collection(db, 'stories');
  const storyDoc = await addDoc(storiesRef, {
    userId: currentUser.uid,
    mediaURL: downloadURL,
    mediaType,
    timestamp: serverTimestamp(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    views: []
  });

  console.log('🎉 Story created successfully! ID:', storyDoc.id);

  return {
    downloadURL,
    postId: storyDoc.id
  };
};
