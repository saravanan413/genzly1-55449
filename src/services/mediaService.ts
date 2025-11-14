
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';
import { networkUploader } from './networkAwareUpload';

/**
 * Upload media for chat messages
 */
export const uploadChatMedia = async (file: File, chatId: string, messageId: string): Promise<string> => {
  try {
    console.log('📤 Uploading chat media:', { chatId, messageId, fileSize: file.size, fileType: file.type });
    
    const uniqueFileName = `${Date.now()}-${file.name}`;
    const storagePath = `chats/${chatId}/${messageId}/${uniqueFileName}`;
    
    console.log('🔗 Storage path:', storagePath);
    
    const result = await networkUploader.uploadFile(
      file, 
      storagePath, 
      {
        timeout: file.size > 10 * 1024 * 1024 ? 300000 : 120000
      },
      { contentType: file.type }
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }
    
    console.log('✅ Chat media upload successful:', result.url);
    return result.url!;
  } catch (error) {
    console.error('❌ Error uploading chat media:', error);
    if (error.code === 'storage/unauthorized') {
      console.error('🔒 Storage unauthorized - check Firebase Storage rules for path:', `chats/${chatId}/${messageId}/`);
    }
    throw error;
  }
};

/**
 * Upload profile picture
 */
export const uploadProfilePicture = async (file: File, userId: string): Promise<string> => {
  try {
    console.log('📤 Uploading profile picture:', { userId, fileSize: file.size, fileType: file.type });
    
    const storagePath = `profilePictures/${userId}/profile.jpg`;
    
    console.log('🔗 Storage path:', storagePath);
    
    const result = await networkUploader.uploadFile(
      file, 
      storagePath, 
      {
        timeout: file.size > 10 * 1024 * 1024 ? 300000 : 120000
      },
      { contentType: file.type }
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }
    
    console.log('✅ Profile picture upload successful:', result.url);
    return result.url!;
  } catch (error) {
    console.error('❌ Error uploading profile picture:', error);
    if (error.code === 'storage/unauthorized') {
      console.error('🔒 Storage unauthorized - check Firebase Storage rules for path:', `profilePictures/${userId}/`);
    }
    throw error;
  }
};

/**
 * Delete media from storage
 */
export const deleteMedia = async (url: string): Promise<void> => {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting media:', error);
    throw error;
  }
};
