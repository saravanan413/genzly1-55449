
import { uploadChatMedia } from '../mediaService';
import { sendMessage } from './messageService';
import { ensureChatExists } from './chatService';
import { logger } from '../../utils/logger';

export const shareMediaToChats = async (
  senderId: string,
  receiverIds: string[],
  media: { type: 'image' | 'video', file: File },
  caption?: string
): Promise<void> => {
  logger.debug('Starting media share to multiple chats', {
    senderId,
    receiverCount: receiverIds.length,
    mediaType: media.type,
    hasCaption: !!caption
  });

  try {
    // Process each receiver
    const sharePromises = receiverIds.map(async (receiverId) => {
      try {
        // Ensure chat exists
        const chatId = await ensureChatExists(senderId, receiverId);
        
        // Upload media to Firebase Storage with unique path for this message
        const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mediaUrl = await uploadChatMedia(media.file, chatId, messageId);
        
        // Send message with media
        const messageText = caption || `Shared a ${media.type}`;
        await sendMessage(
          chatId,
          senderId,
          receiverId,
          messageText,
          media.type,
          mediaUrl
        );
        
        logger.debug('Successfully shared media to chat', { 
          chatId, 
          receiverId, 
          mediaUrl 
        });
      } catch (error) {
        logger.error('Failed to share media to individual chat', { 
          receiverId, 
          error 
        });
        throw error;
      }
    });

    // Wait for all shares to complete
    await Promise.all(sharePromises);
    
    logger.debug('Successfully shared media to all chats');
  } catch (error) {
    logger.error('Failed to share media to chats', error);
    throw error;
  }
};
