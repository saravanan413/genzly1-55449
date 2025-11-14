
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc,
  serverTimestamp,
  writeBatch,
  where,
  getDocs,
  limit,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db, sanitizeMessage } from '../../config/firebase';
import { SecurityService } from '../securityService';
import { ChatMessage } from '../../types/chat';
import { logger } from '../../utils/logger';

export class SecureMessageService {
  // Send message with full security validation
  static async sendMessage(
    chatId: string,
    senderId: string,
    receiverId: string,
    text: string,
    type: 'text' | 'voice' | 'image' | 'video' = 'text',
    mediaURL?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    
    // 1. Validate authentication
    const authCheck = SecurityService.validateAuth();
    if (!authCheck.isValid) {
      return { success: false, error: 'Authentication required' };
    }

    if (authCheck.userId !== senderId) {
      SecurityService.logSuspiciousActivity(authCheck.userId!, 'message_sender_mismatch');
      return { success: false, error: 'Unauthorized sender' };
    }

    // 2. Check rate limiting
    if (!SecurityService.checkActionRateLimit('message')) {
      return { success: false, error: 'Too many messages. Slow down.' };
    }

    // 3. Validate chat access (mirrors Firestore rule)
    const canAccess = await SecurityService.validateChatAccess(chatId, senderId);
    if (!canAccess) {
      return { success: false, error: 'Chat access denied' };
    }

    // 4. Check if sender is blocked by receiver
    const isBlocked = await SecurityService.isUserBlocked(senderId, receiverId);
    if (isBlocked) {
      return { success: false, error: 'Message blocked' };
    }

    // 5. Validate and sanitize content
    if (!text.trim() && !mediaURL) {
      return { success: false, error: 'Message cannot be empty' };
    }

    const sanitizedText = sanitizeMessage(text);

    try {
      // 6. Create message following Firestore security rules structure
      const batch = writeBatch(db);
      
      // Update chat document (Firestore rules will validate this)
      const chatDocRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatDocRef);
      
      const chatData = {
        users: [senderId, receiverId],
        lastMessage: {
          text: sanitizedText,
          timestamp: serverTimestamp(),
          senderId: senderId,
          seen: false
        },
        createdAt: chatDoc.exists() ? chatDoc.data()?.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      batch.set(chatDocRef, chatData, { merge: true });

      // Add message to subcollection
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const messageDocRef = doc(messagesRef);
      
      const messageData = {
        text: sanitizedText,
        senderId,
        receiverId,
        timestamp: serverTimestamp(),
        seen: false,
        status: 'sent',
        type,
        mediaURL: mediaURL || null
      };

      batch.set(messageDocRef, messageData);
      
      await batch.commit();
      
      logger.debug('Secure message sent successfully', { 
        messageId: messageDocRef.id,
        chatId 
      });
      
      return { success: true, messageId: messageDocRef.id };
    } catch (error: any) {
      logger.error('Secure message send failed', error);
      
      // Don't expose internal error details
      if (error.code === 'permission-denied') {
        SecurityService.logSuspiciousActivity(senderId, 'message_permission_denied');
        return { success: false, error: 'Message access denied' };
      }
      
      return { success: false, error: 'Failed to send message' };
    }
  }

  // Subscribe to messages with security validation
  static subscribeToMessages(
    chatId: string,
    currentUserId: string,
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    // Validate authentication
    const authCheck = SecurityService.validateAuth();
    if (!authCheck.isValid) {
      callback([]);
      return () => {};
    }

    if (authCheck.userId !== currentUserId) {
      SecurityService.logSuspiciousActivity(authCheck.userId!, 'message_subscription_mismatch');
      callback([]);
      return () => {};
    }

    // The actual subscription - Firestore rules will handle access control
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

    return onSnapshot(q, 
      (snapshot) => {
        const messages = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.text || '',
            senderId: data.senderId,
            receiverId: data.receiverId,
            timestamp: data.timestamp,
            seen: data.seen || false,
            status: data.status || 'sent',
            type: data.type || 'text',
            mediaURL: data.mediaURL || null,
            delivered: true
          } as ChatMessage;
        });
        
        callback(messages);
      },
      (error) => {
        logger.error('Message subscription error', error);
        if (error.code === 'permission-denied') {
          SecurityService.logSuspiciousActivity(currentUserId, 'message_subscription_denied');
        }
        callback([]);
      }
    );
  }
}
