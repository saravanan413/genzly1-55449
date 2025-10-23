import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  where,
  limit
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';

export interface ChatListItem {
  chatId: string;
  receiverId: string;
  username: string;
  displayName: string;
  avatar?: string;
  lastMessage: string;
  timestamp: number;
  seen: boolean;
  lastSenderId: string;
  unreadCount: number;
  muted?: boolean;
  hidden?: boolean;
}

interface UserData {
  username?: string;
  displayName?: string;
  avatar?: string;
  email?: string;
}

// Cache key for localStorage
const CHAT_LIST_CACHE_KEY = 'genzly_chat_list';

// Cache management functions
export const getCachedChatList = (userId: string): ChatListItem[] => {
  try {
    const cached = localStorage.getItem(`${CHAT_LIST_CACHE_KEY}_${userId}`);
    if (cached) {
      const parsedCache = JSON.parse(cached);
      // Removed cache expiration - always return cached data if available
      logger.debug('Retrieved cached chat list', { chatCount: parsedCache.data.length });
      return parsedCache.data;
    }
  } catch (error) {
    logger.error('Error retrieving cached chat list', error);
  }
  return [];
};

export const setCachedChatList = (userId: string, chats: ChatListItem[]): void => {
  try {
    const cacheData = {
      data: chats,
      timestamp: Date.now()
    };
    localStorage.setItem(`${CHAT_LIST_CACHE_KEY}_${userId}`, JSON.stringify(cacheData));
    logger.debug('Cached chat list updated', { chatCount: chats.length });
  } catch (error) {
    logger.error('Error caching chat list', error);
  }
};

export const clearCachedChatList = (userId?: string): void => {
  try {
    if (userId) {
      localStorage.removeItem(`${CHAT_LIST_CACHE_KEY}_${userId}`);
    } else {
      // Clear all chat caches
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CHAT_LIST_CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    }
    logger.debug('Chat list cache cleared');
  } catch (error) {
    logger.error('Error clearing chat list cache', error);
  }
};

// Helper function to get the latest message from messages subcollection
const getLatestMessage = async (chatId: string) => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const messageDoc = snapshot.docs[0];
      const messageData = messageDoc.data();
      return {
        text: messageData.text || '',
        timestamp: messageData.timestamp,
        senderId: messageData.senderId || '',
        seen: messageData.seen || false
      };
    }
    return null;
  } catch (error) {
    logger.warn('Failed to fetch latest message for chat', { chatId, error });
    return null;
  }
};

export const hydrateUserChatList = async (currentUserId: string): Promise<ChatListItem[]> => {
  logger.debug('Hydrating chat list from Firestore for all user chats', { userId: currentUserId });
  
  if (!currentUserId) {
    return [];
  }

  try {
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('users', 'array-contains', currentUserId)
    );

    const snapshot = await getDocs(q);
    logger.debug('Found total chats for user', { chatCount: snapshot.size, userId: currentUserId });

    const chatPromises = snapshot.docs.map(async (docSnapshot) => {
      const chatData = docSnapshot.data();
      const chatId = docSnapshot.id;
      
      if (!chatData.users || !Array.isArray(chatData.users) || !chatData.users.includes(currentUserId)) {
        return null;
      }
      
      const otherUserId = chatData.users.find((id: string) => id !== currentUserId);
      if (!otherUserId) {
        return null;
      }
      
      // If lastMessage is missing or empty, try to fetch from messages subcollection
      let lastMessage = chatData.lastMessage;
      if (!lastMessage?.text || lastMessage.text.trim() === '') {
        lastMessage = await getLatestMessage(chatId);
        if (!lastMessage?.text) {
          logger.debug('Skipping chat with no messages', { chatId });
          return null;
        }
      }
      
      // Get user data
      let userData: UserData = {};
      try {
        const userDoc = await getDoc(doc(db, 'users', otherUserId));
        if (userDoc.exists()) {
          const userDocData = userDoc.data();
          userData = {
            username: userDocData.username,
            displayName: userDocData.displayName,
            avatar: userDocData.avatar,
            email: userDocData.email
          };
        } else {
          logger.warn('Other user not found', { otherUserId, chatId });
          return null;
        }
      } catch (error) {
        logger.warn('Failed to fetch user data during hydration', { otherUserId, error });
        return null;
      }

      const isMessageSeen = lastMessage.senderId === currentUserId || lastMessage.seen === true;
      const unreadCount = (!isMessageSeen && lastMessage.senderId !== currentUserId) ? 1 : 0;

      // Get user-specific chat metadata (muted, hidden)
      let muted = false;
      let hidden = false;
      try {
        const userChatDoc = await getDoc(doc(db, 'users', currentUserId, 'chats', chatId));
        if (userChatDoc.exists()) {
          const userChatData = userChatDoc.data();
          muted = userChatData.muted || false;
          hidden = userChatData.hidden || false;
        }
      } catch (error) {
        logger.debug('No user chat metadata found', { chatId });
      }

      const chatItem: ChatListItem = {
        chatId,
        receiverId: otherUserId,
        username: userData.username || userData.displayName || userData.email?.split('@')[0] || 'Unknown User',
        displayName: userData.displayName || userData.username || 'Unknown User',
        avatar: userData.avatar,
        lastMessage: lastMessage.text,
        timestamp: lastMessage.timestamp?.toDate?.()?.getTime() || chatData.updatedAt?.toDate?.()?.getTime() || Date.now(),
        seen: isMessageSeen,
        lastSenderId: lastMessage.senderId || '',
        unreadCount,
        muted,
        hidden
      };

      return chatItem;
    });

    const chatResults = await Promise.all(chatPromises);
    const chats = chatResults
      .filter((chat): chat is ChatListItem => chat !== null)
      .sort((a, b) => b.timestamp - a.timestamp);

    logger.debug('Hydrated chat list', { 
      totalFound: snapshot.size, 
      validChats: chats.length,
      userId: currentUserId 
    });

    // Cache the hydrated data
    setCachedChatList(currentUserId, chats);
    
    return chats;
  } catch (error) {
    logger.error('Error hydrating chat list', error);
    return [];
  }
};

export const subscribeToUserChatList = (
  currentUserId: string, 
  callback: (chats: ChatListItem[], isFromCache: boolean) => void
) => {
  logger.debug('Setting up enhanced chat list subscription', { userId: currentUserId });
  
  if (!currentUserId) {
    logger.error('No currentUserId provided to subscribeToUserChatList');
    callback([], false);
    return () => {};
  }

  // First, return cached data immediately if available
  const cachedChats = getCachedChatList(currentUserId);
  if (cachedChats.length > 0) {
    logger.debug('Returning cached chat list first', { chatCount: cachedChats.length });
    callback(cachedChats, true);
  } else {
    // If no cache, perform one-time hydration to get all chats
    logger.debug('No cache found, performing hydration');
    hydrateUserChatList(currentUserId).then(hydratedChats => {
      if (hydratedChats.length > 0) {
        logger.debug('Hydration completed', { chatCount: hydratedChats.length });
        callback(hydratedChats, true);
      }
    });
  }

  try {
    // Set up real-time subscription for updates
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('users', 'array-contains', currentUserId)
    );

    return onSnapshot(q, async (snapshot) => {
      logger.debug('Live chat list updated', { chatCount: snapshot.size });
      
      const chatPromises = snapshot.docs.map(async (docSnapshot) => {
        const chatData = docSnapshot.data();
        const chatId = docSnapshot.id;
        
        if (!chatData.users || !Array.isArray(chatData.users) || !chatData.users.includes(currentUserId)) {
          return null;
        }
        
        const otherUserId = chatData.users.find((id: string) => id !== currentUserId);
        if (!otherUserId) {
          return null;
        }
        
        // Enhanced message checking - try to get from messages subcollection if needed
        let lastMessage = chatData.lastMessage;
        if (!lastMessage?.text || lastMessage.text.trim() === '') {
          lastMessage = await getLatestMessage(chatId);
          if (!lastMessage?.text) {
            return null;
          }
        }
        
        // Get user data
        let userData: UserData = {};
        try {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (userDoc.exists()) {
            const userDocData = userDoc.data();
            userData = {
              username: userDocData.username,
              displayName: userDocData.displayName,
              avatar: userDocData.avatar,
              email: userDocData.email
            };
          } else {
            return null;
          }
        } catch (error) {
          logger.warn('Failed to fetch other user data', { otherUserId, error });
          return null;
        }

        const isMessageSeen = lastMessage.senderId === currentUserId || lastMessage.seen === true;
        const unreadCount = (!isMessageSeen && lastMessage.senderId !== currentUserId) ? 1 : 0;

        // Get user-specific chat metadata (muted, hidden)
        let muted = false;
        let hidden = false;
        try {
          const userChatDoc = await getDoc(doc(db, 'users', currentUserId, 'chats', chatId));
          if (userChatDoc.exists()) {
            const userChatData = userChatDoc.data();
            muted = userChatData.muted || false;
            hidden = userChatData.hidden || false;
          }
        } catch (error) {
          logger.debug('No user chat metadata found', { chatId });
        }

        const chatItem: ChatListItem = {
          chatId,
          receiverId: otherUserId,
          username: userData.username || userData.displayName || userData.email?.split('@')[0] || 'Unknown User',
          displayName: userData.displayName || userData.username || 'Unknown User',
          avatar: userData.avatar,
          lastMessage: lastMessage.text,
          timestamp: lastMessage.timestamp?.toDate?.()?.getTime() || chatData.updatedAt?.toDate?.()?.getTime() || Date.now(),
          seen: isMessageSeen,
          lastSenderId: lastMessage.senderId || '',
          unreadCount,
          muted,
          hidden
        };

        return chatItem;
      });

      const chatResults = await Promise.all(chatPromises);
      const chats = chatResults
        .filter((chat): chat is ChatListItem => chat !== null)
        .sort((a, b) => b.timestamp - a.timestamp);

      // Cache the updated chat list
      setCachedChatList(currentUserId, chats);
      
      logger.debug('Live chat list processed', { chatCount: chats.length });
      callback(chats, false);
    }, (error) => {
      logger.error('Error in live chat list subscription', error);
      const cachedChats = getCachedChatList(currentUserId);
      callback(cachedChats, true);
    });
  } catch (error) {
    logger.error('Error setting up chat list subscription', error);
    const cachedChats = getCachedChatList(currentUserId);
    callback(cachedChats, true);
    return () => {};
  }
};
