
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc,
  serverTimestamp,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db, sanitizeMessage } from '../config/firebase';
import { logger } from '../utils/logger';

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: Timestamp;
  seen: boolean;
  messageType: 'text' | 'voice' | 'image' | 'video';
  mediaURL?: string;
}

export interface TypingStatus {
  userId: string;
  username: string;
  timestamp: Timestamp;
}

export const sendMessage = async (
  chatId: string, 
  senderId: string, 
  content: string, 
  messageType: 'text' | 'voice' | 'image' | 'video' = 'text',
  mediaURL?: string
) => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      content: sanitizeMessage(content),
      senderId,
      receiverId: chatId.split('_').find(id => id !== senderId) || '',
      timestamp: serverTimestamp(),
      seen: false,
      messageType,
      mediaURL: mediaURL || null
    });
  } catch (error) {
    logger.error('Error sending message', error);
    throw error;
  }
};

export const subscribeToMessages = (chatId: string, callback: (messages: ChatMessage[]) => void) => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatMessage[];
    
    callback(messages);
  });
};

export const markMessagesAsSeen = async (chatId: string, userId: string) => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(
      messagesRef, 
      where('receiverId', '==', userId),
      where('seen', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const batch = snapshot.docs.map(docSnapshot => 
      updateDoc(doc(db, 'chats', chatId, 'messages', docSnapshot.id), { seen: true })
    );
    
    await Promise.all(batch);
  } catch (error) {
    logger.error('Error marking messages as seen', error);
  }
};

export const setTypingStatus = async (chatId: string, userId: string, username: string, isTyping: boolean) => {
  try {
    const typingRef = doc(db, 'typingStatus', chatId, 'users', userId);
    
    if (isTyping) {
      await setDoc(typingRef, {
        userId,
        username,
        timestamp: serverTimestamp()
      });
    } else {
      await deleteDoc(typingRef).catch(() => {
        // Ignore if document doesn't exist
      });
    }
  } catch (error) {
    logger.error('Error setting typing status', error);
  }
};

export const subscribeToTypingStatus = (chatId: string, callback: (users: TypingStatus[]) => void) => {
  const typingRef = collection(db, 'typingStatus', chatId, 'users');
  
  return onSnapshot(typingRef, (snapshot) => {
    const now = Date.now();
    const typingUsers = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as TypingStatus & { id: string }))
      .filter(user => {
        // Remove old typing indicators (>3 seconds)
        const userTime = user.timestamp?.toDate?.()?.getTime() || 0;
        return now - userTime < 3000;
      });

    callback(typingUsers);
  });
};
