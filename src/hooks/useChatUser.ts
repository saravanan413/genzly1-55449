
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getChatUser } from '../services/chat/userService';

const DEBUG_MODE = import.meta.env.DEV;

const debugLog = (message: string, ...args: unknown[]) => {
  if (DEBUG_MODE) {
    // eslint-disable-next-line no-console
    console.log(`[useChatUser] ${message}`, ...args);
  }
};

const debugError = (message: string, error: unknown) => {
  if (DEBUG_MODE) {
    // eslint-disable-next-line no-console
    console.error(`[useChatUser] ${message}`, error);
  }
};

interface ChatUser {
  id: string;
  username?: string;
  displayName?: string;
  avatar?: string;
}

export const useChatUser = (targetUserId: string) => {
  const { currentUser } = useAuth();
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);

  useEffect(() => {
    if (currentUser && targetUserId && targetUserId !== currentUser.uid) {
      debugLog('Loading chat user info for:', targetUserId);
      getChatUser(currentUser.uid, targetUserId).then(user => {
        debugLog('Chat user loaded:', user);
        setChatUser(user);
      }).catch(error => {
        debugError('Error loading chat user:', error);
      });
    }
  }, [currentUser, targetUserId]);

  return { chatUser };
};
