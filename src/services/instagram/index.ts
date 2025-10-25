/**
 * Instagram-Style Services Entry Point
 * 
 * Unified export for all Instagram-style functionality:
 * - Media compression
 * - Upload services
 * - Progress tracking
 */

export {
  uploadProfilePicture,
  uploadPost,
  uploadReel,
  uploadStory,
  uploadChatMedia,
  type UploadResult,
  type UploadProgress,
  type UploadOptions
} from './uploadService';

export {
  compressImage,
  generateImageThumbnail,
  generateVideoThumbnail,
  prepareMediaForUpload,
  getVideoDuration,
  validateFileSize,
  formatFileSize,
  type CompressionResult
} from './compressionService';
