import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getUserProfile } from './firestoreService';

export interface CreatePostData {
  userId: string;
  mediaURL: string;
  caption: string;
  mediaType: 'image' | 'video';
}

/**
 * Create a post document in Firestore after successful Storage upload
 */
export async function createPostDocument(data: CreatePostData): Promise<string> {
  const userProfile = await getUserProfile(data.userId);
  
  const postRef = doc(collection(db, 'posts'));
  
  await setDoc(postRef, {
    userId: data.userId,
    mediaURL: data.mediaURL,
    caption: data.caption,
    mediaType: data.mediaType,
    timestamp: serverTimestamp(),
    username: userProfile?.username || 'unknown',
    displayName: userProfile?.displayName || 'Unknown User',
    userAvatar: userProfile?.avatar || '',
    privacy: userProfile?.isPrivate ? 'private' : 'public',
    followersOnly: userProfile?.isPrivate || false,
    likeCount: 0,
    commentCount: 0,
  });

  console.log('[PostService] Post document created:', postRef.id);
  return postRef.id;
}

/**
 * Create a reel document in Firestore after successful Storage upload
 */
export async function createReelDocument(data: CreatePostData): Promise<string> {
  const userProfile = await getUserProfile(data.userId);
  
  const reelRef = doc(collection(db, 'reels'));
  
  await setDoc(reelRef, {
    userId: data.userId,
    mediaURL: data.mediaURL,
    videoURL: data.mediaURL,
    caption: data.caption,
    mediaType: data.mediaType,
    timestamp: serverTimestamp(),
    username: userProfile?.username || 'unknown',
    displayName: userProfile?.displayName || 'Unknown User',
    userAvatar: userProfile?.avatar || '',
    privacy: userProfile?.isPrivate ? 'private' : 'public',
    followersOnly: userProfile?.isPrivate || false,
    likeCount: 0,
    commentCount: 0,
    shares: 0,
    music: 'Original Audio',
  });

  console.log('[PostService] Reel document created:', reelRef.id);
  return reelRef.id;
}
