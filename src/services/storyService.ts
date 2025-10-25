
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadStory } from './instagram/uploadService';

export interface Story {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  text?: string;
  backgroundColor?: string;
  createdAt: any;
  expiresAt: any;
  viewers: string[];
  viewCount: number;
}

/**
 * Create story using Instagram-style upload service
 */
export const createStory = async (
  userId: string,
  mediaFile: File | null,
  text?: string,
  backgroundColor?: string
) => {
  try {
    if (!mediaFile) {
      throw new Error('Media file is required');
    }

    const mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';

    // Upload using Instagram service
    const result = await uploadStory(mediaFile, mediaType);

    // Get user data
    const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
    const userData = userDoc.docs[0]?.data();

    // Update story with additional metadata
    if (result.postId) {
      const storyRef = doc(db, 'stories', result.postId);
      await updateDoc(storyRef, {
        username: userData?.username || 'Unknown',
        displayName: userData?.displayName || 'Unknown User',
        avatar: userData?.avatar || null,
        mediaUrl: result.downloadURL,
        text: text || '',
        backgroundColor: backgroundColor || '#000000',
      });
    }

    console.log('✅ Story created with ID:', result.postId);
    return result.postId;
  } catch (error) {
    console.error('❌ Error creating story:', error);
    throw error;
  }
};

export const getActiveStories = async () => {
  try {
    const now = new Date();
    const q = query(
      collection(db, 'stories'),
      where('expiresAt', '>', now),
      orderBy('expiresAt'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Story[];
  } catch (error) {
    console.error('Error getting stories:', error);
    return [];
  }
};

export const viewStory = async (storyId: string, viewerId: string) => {
  try {
    const storyRef = doc(db, 'stories', storyId);
    await updateDoc(storyRef, {
      viewers: [...new Set([viewerId])],
      viewCount: 1
    });
  } catch (error) {
    console.error('Error viewing story:', error);
  }
};

export const subscribeToUserStories = (userId: string, callback: (stories: Story[]) => void) => {
  const q = query(
    collection(db, 'stories'),
    where('userId', '==', userId),
    where('expiresAt', '>', new Date()),
    orderBy('expiresAt'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const stories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Story[];
    callback(stories);
  });
};
