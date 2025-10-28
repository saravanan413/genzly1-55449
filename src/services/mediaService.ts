
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { storage, db } from '../config/firebase';
import { networkUploader } from './networkAwareUpload';

export const uploadChatMedia = async (file: File, chatId: string, messageId: string): Promise<string> => {
  try {
    console.log('📤 Uploading chat media:', { chatId, messageId, fileSize: file.size, fileType: file.type });
    
    // Generate unique filename: Date.now() + '-' + originalName
    const uniqueFileName = `${Date.now()}-${file.name}`;
    const storagePath = `chats/${chatId}/${messageId}/${uniqueFileName}`;
    
    console.log('🔗 Storage path:', storagePath);
    
    const result = await networkUploader.uploadFile(
      file, 
      storagePath, 
      {
        timeout: file.size > 10 * 1024 * 1024 ? 300000 : 120000
      },
      { contentType: file.type }
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }
    console.log('✅ Chat media upload successful:', result.url);
    return result.url!;
  } catch (error) {
    console.error('❌ Error uploading chat media:', error);
    if (error.code === 'storage/unauthorized') {
      console.error('🔒 Storage unauthorized - check Firebase Storage rules for path:', `chats/${chatId}/${messageId}/`);
    }
    throw error;
  }
};

/**
 * Upload multiple versions of post media (original, feed, thumbnail)
 * Returns URLs for all versions
 */
export const uploadPostMediaVersions = async (
  userId: string,
  original: File,
  feed?: File,
  thumb?: File,
  onProgress?: (stage: string, progress: number) => void
): Promise<{ original: string; feed?: string; thumb?: string }> => {
  try {
    console.log('📤 Starting multi-version post media upload:', { 
      userId, 
      originalSize: original.size,
      hasFeed: !!feed,
      hasThumb: !!thumb
    });

    const timestamp = Date.now();
    const baseName = original.name.split('.')[0];
    
    // Upload original
    onProgress?.('uploadingOriginal', 0);
    const originalPath = `posts/${userId}/${timestamp}-${original.name}`;
    const originalResult = await networkUploader.uploadFile(
      original,
      originalPath,
      {
        timeout: original.size > 10 * 1024 * 1024 ? 300000 : 120000,
        onProgress: (progress) => onProgress?.('uploadingOriginal', progress)
      },
      { contentType: original.type }
    );

    if (!originalResult.success) {
      throw new Error(originalResult.error || 'Original upload failed');
    }

    const urls: { original: string; feed?: string; thumb?: string } = {
      original: originalResult.url!
    };

    // Upload feed version if provided
    if (feed) {
      onProgress?.('uploadingFeed', 0);
      const feedPath = `posts/${userId}/${timestamp}-feed_${baseName}.jpg`;
      const feedResult = await networkUploader.uploadFile(
        feed,
        feedPath,
        {
          timeout: 120000,
          onProgress: (progress) => onProgress?.('uploadingFeed', progress)
        },
        { contentType: 'image/jpeg' }
      );

      if (feedResult.success) {
        urls.feed = feedResult.url!;
      }
    }

    // Upload thumbnail version if provided
    if (thumb) {
      onProgress?.('uploadingThumb', 0);
      const thumbPath = `posts/${userId}/${timestamp}-thumb_${baseName}.jpg`;
      const thumbResult = await networkUploader.uploadFile(
        thumb,
        thumbPath,
        {
          timeout: 120000,
          onProgress: (progress) => onProgress?.('uploadingThumb', progress)
        },
        { contentType: 'image/jpeg' }
      );

      if (thumbResult.success) {
        urls.thumb = thumbResult.url!;
      }
    }

    console.log('✅ Multi-version post media upload successful:', urls);
    return urls;
  } catch (error) {
    console.error('❌ Error uploading post media versions:', error);
    throw error;
  }
};

export const uploadPostMedia = async (file: File, userId: string): Promise<string> => {
  try {
    console.log('📤 Starting network-aware post media upload:', { userId, fileSize: file.size, fileType: file.type });
    
    // Generate unique filename: Date.now() + '-' + originalName
    const uniqueFileName = `${Date.now()}-${file.name}`;
    const storagePath = `posts/${userId}/${uniqueFileName}`;
    
    console.log('🔗 Storage path:', storagePath);
    
    const result = await networkUploader.uploadFile(
      file, 
      storagePath, 
      {
        timeout: file.size > 10 * 1024 * 1024 ? 300000 : 120000
      },
      { contentType: file.type }
    );

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    console.log('✅ Post media upload successful:', result.url);
    return result.url!;
  } catch (error) {
    console.error('❌ Error uploading post media:', error);
    throw error;
  }
};

export const createPost = async (
  userId: string,
  caption: string,
  mediaURL: string,
  mediaType: 'image' | 'video'
): Promise<string> => {
  try {
    const postsRef = collection(db, 'posts');
    const docRef = await addDoc(postsRef, {
      userId,
      caption,
      mediaURL,
      mediaType,
      timestamp: serverTimestamp(),
      likes: 0,
      likedBy: []
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

export const uploadProfilePicture = async (file: File, userId: string): Promise<string> => {
  try {
    console.log('📤 Uploading profile picture:', { userId, fileSize: file.size, fileType: file.type });
    
    // Always use profile.jpg to overwrite previous profile picture
    const storagePath = `profilePictures/${userId}/profile.jpg`;
    
    console.log('🔗 Storage path:', storagePath);
    
    const result = await networkUploader.uploadFile(
      file, 
      storagePath, 
      {
        timeout: file.size > 10 * 1024 * 1024 ? 300000 : 120000
      },
      { contentType: file.type }
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }
    console.log('✅ Profile picture upload successful:', result.url);
    return result.url!;
  } catch (error) {
    console.error('❌ Error uploading profile picture:', error);
    if (error.code === 'storage/unauthorized') {
      console.error('🔒 Storage unauthorized - check Firebase Storage rules for path:', `profilePictures/${userId}/`);
    }
    throw error;
  }
};

export const uploadStoryMedia = async (file: File, userId: string): Promise<string> => {
  try {
    console.log('📤 Uploading story media:', { userId, fileSize: file.size, fileType: file.type });
    
    // Generate unique filename: Date.now() + '-' + originalName
    const uniqueFileName = `${Date.now()}-${file.name}`;
    const storagePath = `stories/${userId}/${uniqueFileName}`;
    
    console.log('🔗 Storage path:', storagePath);
    
    const result = await networkUploader.uploadFile(
      file, 
      storagePath, 
      {
        timeout: file.size > 10 * 1024 * 1024 ? 300000 : 120000
      },
      { contentType: file.type }
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }
    console.log('✅ Story media upload successful:', result.url);
    return result.url!;
  } catch (error) {
    console.error('❌ Error uploading story media:', error);
    throw error;
  }
};

export const createStory = async (
  userId: string,
  mediaURL: string,
  mediaType: 'image' | 'video'
): Promise<string> => {
  try {
    const storiesRef = collection(db, 'stories');
    const docRef = await addDoc(storiesRef, {
      userId: userId, // Use userId for consistency with other collections
      mediaURL,
      mediaType,
      timestamp: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      views: []
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating story:', error);
    throw error;
  }
};

export const uploadReelMedia = async (file: File, userId: string): Promise<string> => {
  try {
    console.log('📤 Starting network-aware reel media upload:', { userId, fileSize: file.size, fileType: file.type });
    
    // Generate unique filename: Date.now() + '-' + originalName
    const uniqueFileName = `${Date.now()}-${file.name}`;
    const storagePath = `reels/${userId}/${uniqueFileName}`;
    
    console.log('🔗 Storage path:', storagePath);
    
    const result = await networkUploader.uploadFile(
      file, 
      storagePath, 
      {
        timeout: Math.max(300000, file.size / 1024 / 1024 * 30000)
      },
      { contentType: file.type }
    );

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    console.log('✅ Reel media upload successful:', result.url);
    return result.url!;
  } catch (error) {
    console.error('❌ Error uploading reel media:', error);
    throw error;
  }
};

// Upload-first pattern functions
export const generateFirestoreId = (collectionName: string): string => {
  return doc(collection(db, collectionName)).id;
};

/**
 * Create complete post with optimized media versions
 * Instagram-style with original, feed, and thumbnail URLs
 */
export const createCompletePostWithVersions = async (
  userId: string,
  caption: string,
  mediaVersions: { original: File; feed?: File; thumb?: File },
  mediaType: 'image' | 'video',
  settings: { allowComments: boolean; hideLikeCount: boolean } = { allowComments: true, hideLikeCount: false },
  onProgress?: (stage: string, progress: number) => void
): Promise<string> => {
  console.log('🚀 Starting createCompletePostWithVersions:', { 
    userId, 
    caption, 
    mediaType, 
    originalSize: mediaVersions.original.size,
    hasOptimizedVersions: !!(mediaVersions.feed || mediaVersions.thumb),
    settings 
  });
  
  try {
    // Upload all media versions
    const urls = await uploadPostMediaVersions(
      userId,
      mediaVersions.original,
      mediaVersions.feed,
      mediaVersions.thumb,
      onProgress
    );

    // Create complete post document with all URLs
    onProgress?.('savingMetadata', 0);
    console.log('📄 Creating Firestore document with media versions...');
    const postsRef = collection(db, 'posts');
    const docRef = await addDoc(postsRef, {
      userId,
      caption,
      mediaURL: urls.original,
      feedURL: urls.feed || urls.original,
      thumbURL: urls.thumb || urls.feed || urls.original,
      mediaType,
      timestamp: serverTimestamp(),
      likes: 0,
      likedBy: [],
      allowComments: settings.allowComments,
      hideLikeCount: settings.hideLikeCount
    });
    
    onProgress?.('savingMetadata', 100);
    console.log('🎉 Post created successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error in createCompletePostWithVersions:', error);
    
    if (error?.code) {
      console.error('🔴 Firebase error code:', error.code);
      console.error('🔴 Firebase error message:', error.message);
    }
    
    throw error;
  }
};

export const createCompletePost = async (
  userId: string,
  caption: string,
  file: File,
  mediaType: 'image' | 'video',
  settings: { allowComments: boolean; hideLikeCount: boolean } = { allowComments: true, hideLikeCount: false },
  onProgress?: (progress: number) => void
): Promise<string> => {
  console.log('🚀 Starting createCompletePost with network-aware upload:', { 
    userId, 
    caption, 
    mediaType, 
    fileSize: file.size, 
    fileName: file.name,
    fileType: file.type,
    settings 
  });
  
  try {
    // Generate unique filename
    const uniqueFileName = `${Date.now()}-${file.name}`;
    const storagePath = `posts/${userId}/${uniqueFileName}`;

    // Validate path format matches rules
    if (!storagePath.match(/^posts\/[^\/]+\/[^\/]+$/)) {
      throw new Error(`Invalid storage path format: ${storagePath}`);
    }

    console.log('✅ Upload path validated:', storagePath);
    
    // Upload media first using network-aware uploader
    console.log('📤 Starting network-aware media upload...');
    const result = await networkUploader.uploadFile(
      file, 
      storagePath, 
      {
        onProgress,
        timeout: file.size > 10 * 1024 * 1024 ? 300000 : 120000
      },
      { contentType: file.type }
    );

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    console.log('✅ Media upload successful:', result.url);
    
    // Create complete post document with mediaURL already populated
    console.log('📄 Creating Firestore document...');
    const postsRef = collection(db, 'posts');
    const docRef = await addDoc(postsRef, {
      userId,
      caption,
      mediaURL: result.url,
      mediaType,
      timestamp: serverTimestamp(),
      likes: 0,
      likedBy: [],
      allowComments: settings.allowComments,
      hideLikeCount: settings.hideLikeCount
    });
    
    console.log('🎉 Post created successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error in createCompletePost:', error);
    
    // Log specific error details
    if (error?.code) {
      console.error('🔴 Firebase error code:', error.code);
      console.error('🔴 Firebase error message:', error.message);
    }
    
    throw error;
  }
};

export const createStorySkeleton = async (userId: string, mediaType: 'image' | 'video'): Promise<string> => {
  try {
    const storiesRef = collection(db, 'stories');
    const docRef = await addDoc(storiesRef, {
      userId: userId, // Use userId for consistency
      mediaURL: '', // Will be updated after upload
      mediaType,
      timestamp: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      views: []
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating story skeleton:', error);
    throw error;
  }
};

export const updateStoryWithMedia = async (storyId: string, mediaURL: string): Promise<void> => {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    const storyRef = doc(db, 'stories', storyId);
    await updateDoc(storyRef, { mediaURL });
  } catch (error) {
    console.error('Error updating story with media:', error);
    throw error;
  }
};

export const deleteMedia = async (url: string): Promise<void> => {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting media:', error);
    throw error;
  }
};
