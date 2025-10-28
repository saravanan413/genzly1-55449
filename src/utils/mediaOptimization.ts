/**
 * Instagram-style Media Optimization Utilities
 * 
 * This module handles client-side image and video optimization to create:
 * - Original full-quality version
 * - Feed-sized version (1080px max)
 * - Thumbnail version (480px max)
 */

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
 * Compress and resize image to specific dimensions
 */
const resizeImage = async (
  file: File,
  maxWidth: number,
  quality: number = 0.9
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const optimizedFile = new File(
              [blob],
              file.name,
              { type: 'image/jpeg' }
            );
            resolve(optimizedFile);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Create optimized versions of an image
 * - Original: Full quality
 * - Feed: 1080px max width (Instagram feed size)
 * - Thumb: 480px max width (thumbnail size)
 */
export const optimizeImage = async (file: File): Promise<OptimizedMedia> => {
  console.log('🖼️ Optimizing image:', file.name);

  try {
    // Create feed version (1080px)
    const feedVersion = await resizeImage(file, 1080, 0.85);
    console.log('✅ Feed version created:', feedVersion.size / 1024, 'KB');

    // Create thumbnail version (480px)
    const thumbVersion = await resizeImage(file, 480, 0.75);
    console.log('✅ Thumb version created:', thumbVersion.size / 1024, 'KB');

    return {
      original: file,
      feed: feedVersion,
      thumb: thumbVersion,
    };
  } catch (error) {
    console.error('❌ Error optimizing image:', error);
    throw error;
  }
};

/**
 * Create a video thumbnail from the first frame
 */
export const createVideoThumbnail = async (
  file: File,
  width: number = 480
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      // Seek to 1 second or start
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      // Calculate dimensions
      let height = (video.videoHeight * width) / video.videoWidth;
      canvas.width = width;
      canvas.height = height;

      // Draw frame
      ctx?.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const thumbnailFile = new File(
              [blob],
              `${file.name}_thumb.jpg`,
              { type: 'image/jpeg' }
            );
            resolve(thumbnailFile);
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        },
        'image/jpeg',
        0.75
      );

      // Cleanup
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(file);
    video.load();
  });
};

/**
 * Optimize video - creates thumbnail
 * Note: Full video optimization requires server-side processing
 */
export const optimizeVideo = async (file: File): Promise<OptimizedMedia> => {
  console.log('🎥 Creating video thumbnail:', file.name);

  try {
    // Create thumbnail from first frame
    const thumbVersion = await createVideoThumbnail(file, 480);
    console.log('✅ Video thumbnail created:', thumbVersion.size / 1024, 'KB');

    return {
      original: file,
      thumb: thumbVersion,
    };
  } catch (error) {
    console.error('❌ Error creating video thumbnail:', error);
    // Return original if thumbnail creation fails
    return {
      original: file,
    };
  }
};

/**
 * Get file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validate file size
 */
export const validateFileSize = (file: File, maxSizeMB: number = 100): boolean => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
};

/**
 * Validate file type
 */
export const validateMediaType = (file: File): 'image' | 'video' | null => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
};
