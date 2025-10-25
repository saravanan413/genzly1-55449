/**
 * Media Service - Legacy Compatibility Layer
 * 
 * This file re-exports the new Instagram-style upload services
 * for backward compatibility with existing code.
 * 
 * All new code should import directly from:
 * - src/services/instagram/uploadService.ts
 * - src/services/instagram/compressionService.ts
 */

// Re-export Instagram upload functions
export {
  uploadProfilePicture,
  uploadPost,
  uploadReel,
  uploadStory,
  uploadChatMedia,
  type UploadResult,
  type UploadProgress
} from './instagram/uploadService';

// Re-export compression utilities
export {
  prepareMediaForUpload,
  validateFileSize,
  formatFileSize,
  getVideoDuration
} from './instagram/compressionService';
