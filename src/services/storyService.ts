
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

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

export const createStory = async (
  userId: string,
  mediaFile: File | null,
  text?: string,
  backgroundColor?: string
) => {
  try {
    let mediaUrl = '';
    let mediaType: 'image' | 'video' = 'image';

    if (mediaFile) {
      // Upload media to Firebase Storage
      const storageRef = ref(storage, `stories/${userId}/${Date.now()}_${mediaFile.name}`);
      const uploadResult = await uploadBytes(storageRef, mediaFile);
      mediaUrl = await getDownloadURL(uploadResult.ref);
      mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
    }

    // Get user data
    const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
    const userData = userDoc.docs[0]?.data();

    const storyData = {
      userId,
      username: userData?.username || 'Unknown',
      displayName: userData?.displayName || 'Unknown User',
      avatar: userData?.avatar || null,
      mediaUrl,
      mediaType,
      text: text || '',
      backgroundColor: backgroundColor || '#000000',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      viewers: [],
      viewCount: 0
    };

    const storyRef = await addDoc(collection(db, 'stories'), storyData);
    console.log('Story created with ID:', storyRef.id);
    return storyRef.id;
  } catch (error) {
    console.error('Error creating story:', error);
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
