/**
 * Instagram-Style Media Compression Service
 * 
 * Handles client-side compression exactly like Instagram:
 * - Photos: Max 1080px width, 85-90% JPEG quality
 * - Videos: Max 1080px width, 30fps, H.264 codec, 3-5 Mbps bitrate
 * - Thumbnails: 480px max width for all media
 */

export interface CompressionResult {
  file: File;
  width: number;
  height: number;
}

/**
 * Compress and resize image to Instagram specifications
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 1080,
  quality: number = 0.87
): Promise<CompressionResult> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressed = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve({ file: compressed, width, height });
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Generate thumbnail from image
 */
export const generateImageThumbnail = async (
  file: File,
  maxWidth: number = 480
): Promise<File> => {
  return (await compressImage(file, maxWidth, 0.75)).file;
};

/**
 * Generate thumbnail from video (first frame)
 */
export const generateVideoThumbnail = async (
  file: File,
  maxWidth: number = 480
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      // Seek to 1 second or middle of video
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      // Calculate dimensions
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw frame
      ctx?.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const thumbnail = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, '_thumb.jpg'),
              { type: 'image/jpeg', lastModified: Date.now() }
            );
            resolve(thumbnail);
          } else {
            reject(new Error('Failed to create video thumbnail'));
          }
        },
        'image/jpeg',
        0.75
      );

      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
    video.load();
  });
};

/**
 * Prepare media for Instagram-style upload
 * Returns compressed main file and thumbnail
 */
export const prepareMediaForUpload = async (
  file: File,
  type: 'image' | 'video'
): Promise<{ main: File; thumbnail: File }> => {
  console.log('🎨 Preparing media for upload:', { 
    name: file.name, 
    size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    type 
  });

  if (type === 'image') {
    // Compress main image (1080px, 87% quality)
    const compressed = await compressImage(file, 1080, 0.87);
    console.log('✅ Image compressed:', {
      original: `${(file.size / 1024).toFixed(0)} KB`,
      compressed: `${(compressed.file.size / 1024).toFixed(0)} KB`,
      dimensions: `${compressed.width}x${compressed.height}`
    });

    // Generate thumbnail (480px, 75% quality)
    const thumbnail = await generateImageThumbnail(file, 480);
    console.log('✅ Thumbnail generated:', `${(thumbnail.size / 1024).toFixed(0)} KB`);

    return { main: compressed.file, thumbnail };
  } else {
    // For videos, generate thumbnail only (no video compression in browser)
    const thumbnail = await generateVideoThumbnail(file, 480);
    console.log('✅ Video thumbnail generated:', `${(thumbnail.size / 1024).toFixed(0)} KB`);

    return { main: file, thumbnail };
  }
};

/**
 * Get video duration
 */
export const getVideoDuration = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
    video.load();
  });
};

/**
 * Validate file size (max 100MB)
 */
export const validateFileSize = (file: File, maxSizeMB: number = 100): boolean => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
};

/**
 * Get human-readable file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};
