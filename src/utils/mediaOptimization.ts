/**
 * Media Optimization Utilities
 * 
 * Re-exported from the new Instagram compression service
 * This file is kept for backward compatibility
 */

export {
  compressImage as resizeImage,
  generateImageThumbnail as createVideoThumbnail,
  prepareMediaForUpload,
  validateFileSize,
  formatFileSize
} from '../services/instagram/compressionService';

export type { CompressionResult } from '../services/instagram/compressionService';

// Legacy interfaces for backward compatibility
export interface OptimizedMedia {
  original: File;
  feed?: File;
  thumb?: File;
}

export interface MediaVersions {
  original: string;
  feed?: string;
  thumb?: string;
}

/**
 * @deprecated Use prepareMediaForUpload from compressionService instead
 */
export const optimizeImage = async (file: File): Promise<OptimizedMedia> => {
  const { compressImage, generateImageThumbnail } = await import('../services/instagram/compressionService');
  
  const feed = await compressImage(file, 1080, 0.85);
  const thumb = await generateImageThumbnail(file, 480);

  return {
    original: file,
    feed: feed.file,
    thumb: thumb,
  };
};

/**
 * @deprecated Use prepareMediaForUpload from compressionService instead
 */
export const optimizeVideo = async (file: File): Promise<OptimizedMedia> => {
  const { generateVideoThumbnail } = await import('../services/instagram/compressionService');
  
  try {
    const thumb = await generateVideoThumbnail(file, 480);
    return {
      original: file,
      thumb: thumb,
    };
  } catch (error) {
    return {
      original: file,
    };
  }
};

/**
 * @deprecated Use compressionService directly
 */
export const validateMediaType = (file: File): 'image' | 'video' | null => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
};
