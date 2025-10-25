/**
 * Instagram-Style Upload Service
 * 
 * Re-exported from the new unified upload service
 * This file is kept for backward compatibility
 */

export { uploadPost as createInstagramPost, uploadReel as createInstagramReel, uploadStory as createInstagramStory } from './instagram/uploadService';
export type { UploadResult } from './instagram/uploadService';

