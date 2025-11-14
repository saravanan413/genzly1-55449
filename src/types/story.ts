import { Timestamp } from 'firebase/firestore';

export interface Story {
  id: string;
  userId: string;
  displayName: string;
  avatar: string;
  mediaUrl: string | null;
  mediaType?: 'image' | 'video';
  text?: string;
  backgroundColor?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  viewers: string[];
  viewCount: number;
}
