import { doc, setDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';

export const muteChatForUser = async (userId: string, chatId: string, mute: boolean): Promise<void> => {
  try {
    const userChatRef = doc(db, 'users', userId, 'chats', chatId);
    await setDoc(userChatRef, {
      muted: mute,
      mutedAt: mute ? Date.now() : null,
    }, { merge: true });
    logger.debug('Chat mute status updated', { userId, chatId, muted: mute });
  } catch (error) {
    logger.error('Failed to update chat mute status', error);
    throw error;
  }
};

export const hideChatForUser = async (userId: string, chatId: string): Promise<void> => {
  try {
    const userChatRef = doc(db, 'users', userId, 'chats', chatId);
    await setDoc(userChatRef, {
      hidden: true,
      hiddenAt: Date.now(),
    }, { merge: true });
    logger.debug('Chat hidden for user', { userId, chatId });
  } catch (error) {
    logger.error('Failed to hide chat', error);
    throw error;
  }
};

export const unhideChatForUser = async (userId: string, chatId: string): Promise<void> => {
  try {
    const userChatRef = doc(db, 'users', userId, 'chats', chatId);
    await setDoc(userChatRef, {
      hidden: false,
      hiddenAt: null,
    }, { merge: true });
    logger.debug('Chat unhidden for user', { userId, chatId });
  } catch (error) {
    logger.error('Failed to unhide chat', error);
    throw error;
  }
};

export const deleteChatForUser = async (userId: string, chatId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Delete user's chat metadata
    const userChatRef = doc(db, 'users', userId, 'chats', chatId);
    batch.delete(userChatRef);
    
    // Delete all messages for this user in this chat
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messagesQuery = query(messagesRef);
    const messagesSnapshot = await getDocs(messagesQuery);
    
    messagesSnapshot.forEach((messageDoc) => {
      // Mark messages as deleted for this user
      const messageRef = doc(db, 'chats', chatId, 'messages', messageDoc.id);
      batch.update(messageRef, {
        [`deletedFor.${userId}`]: true,
      });
    });
    
    await batch.commit();
    logger.debug('Chat deleted for user', { userId, chatId });
  } catch (error) {
    logger.error('Failed to delete chat for user', error);
    throw error;
  }
};

export const getHiddenChatsForUser = async (userId: string): Promise<string[]> => {
  try {
    const userChatsRef = collection(db, 'users', userId, 'chats');
    const hiddenChatsQuery = query(userChatsRef, where('hidden', '==', true));
    const snapshot = await getDocs(hiddenChatsQuery);
    
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    logger.error('Failed to fetch hidden chats', error);
    return [];
  }
};
