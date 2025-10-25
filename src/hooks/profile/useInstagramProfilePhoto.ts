/**
 * Instagram-Style Profile Photo Upload Hook
 * 
 * Handles profile picture upload with:
 * - Image cropping
 * - Automatic compression (1080px max)
 * - Progress tracking
 * - Retry logic
 */

import { useState, ChangeEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { uploadProfilePicture } from '@/services/instagram/uploadService';
import { validateFileSize } from '@/services/instagram/compressionService';

export const useInstagramProfilePhoto = () => {
  const [uploading, setUploading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (JPG, PNG, WebP)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (!validateFileSize(file, 10)) {
      toast({
        title: "File Too Large",
        description: "Please select an image under 10MB",
        variant: "destructive"
      });
      return;
    }

    // Load image for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropDone = async (croppedImage: string, onImageUpdate: (url: string) => void) => {
    setShowCropModal(false);

    // Convert base64 to Blob
    const response = await fetch(croppedImage);
    const blob = await response.blob();
    const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });

    // Show local preview immediately
    onImageUpdate(croppedImage);

    toast({
      title: "Ready to Save",
      description: "Click Save to upload your new profile picture"
    });

    // Start upload
    try {
      setUploading(true);
      setUploadProgress(0);

      const downloadURL = await uploadProfilePicture(file, (progress) => {
        setUploadProgress(progress);
      });

      // Update with final URL
      onImageUpdate(downloadURL);

      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been updated successfully"
      });
    } catch (error) {
      console.error('Upload failed:', error);
      
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload profile picture",
        variant: "destructive"
      });

      // Revert to previous image
      onImageUpdate('');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop('');
  };

  const handleRemovePhoto = async (onImageUpdate: (url: string) => void) => {
    if (!currentUser) return;

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      
      await updateDoc(doc(db, 'users', currentUser.uid), {
        avatar: ''
      });

      onImageUpdate('');

      toast({
        title: "Profile Picture Removed",
        description: "Your profile picture has been removed"
      });
    } catch (error) {
      console.error('Failed to remove photo:', error);
      toast({
        title: "Error",
        description: "Failed to remove profile picture",
        variant: "destructive"
      });
    }
  };

  return {
    uploading,
    uploadProgress,
    showCropModal,
    imageToCrop,
    handleFileChange,
    handleCropDone,
    handleCropCancel,
    handleRemovePhoto
  };
};
