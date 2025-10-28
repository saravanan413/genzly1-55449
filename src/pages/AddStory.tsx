
import { useState, useRef } from 'react';
import { ArrowLeft, Camera, Image, Type, Palette, Send, VideoIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadStoryMedia, createStorySkeleton, updateStoryWithMedia } from '../services/mediaService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import CropImageModal from "@/components/CropImageModal";
import { useToast } from '@/hooks/use-toast';

const AddStory = () => {
  const [selectedFile, setSelectedFile] = useState<{type: 'image' | 'video', data: string, file: File} | null>(null);
  const [storyText, setStoryText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [showCrop, setShowCrop] = useState(false);
  const [cropImageData, setCropImageData] = useState<string | null>(null);
  
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileType = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : null;
      if (!fileType) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        if (fileType === 'image') {
          setCropImageData(e.target?.result as string);
          setShowCrop(true);
        } else if (fileType === 'video') {
          setSelectedFile({ type: 'video', data: e.target?.result as string, file });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handlePublishStory = async () => {
    if (!selectedFile && !storyText.trim()) {
      toast({
        title: "Empty Story",
        description: "Please add an image, video, or text to your story.",
        variant: "destructive"
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to publish stories.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (selectedFile) {
        // Create story skeleton first
        const storyId = await createStorySkeleton(currentUser.uid, selectedFile.type);
        
        // Upload media story
        const mediaURL = await uploadStoryMedia(selectedFile.file, storyId);
        
        // Update story with media URL
        await updateStoryWithMedia(storyId, mediaURL);
      } else {
        // Create text-only story (you'd need to generate an image from text)
        // For now, we'll skip text-only stories or create a simple colored background
        toast({
          title: "Feature Coming Soon",
          description: "Text-only stories will be available soon!",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Story Published! 🎉",
        description: "Your story has been added and will be visible for 24 hours."
      });

      navigate('/');
    } catch (error) {
      console.error('Error publishing story:', error);
      toast({
        title: "Error",
        description: "Failed to publish story. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCropDone = (croppedImage: string) => {
    // Convert base64 to File object
    const canvas = document.createElement('canvas');
    const img = document.createElement('img');
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'story-image.jpg', { type: 'image/jpeg' });
          setSelectedFile({ type: 'image', data: croppedImage, file });
        }
      });
    };
    img.src = croppedImage;
    
    setCropImageData(null);
    setShowCrop(false);
  };

  const handleCropCancel = () => {
    setCropImageData(null);
    setShowCrop(false);
  };

  const colorOptions = [
    '#ffffff', '#000000', '#ff4757', '#2ed573', '#3742fa',
    '#ffa502', '#ff6b81', '#5f27cd', '#00d2d3', '#ff9ff3'
  ];

  if (!currentUser) {
    return <div>Please log in to create stories</div>;
  }

  return (
    <>
      {/* Crop Modal */}
      {cropImageData && (
        <CropImageModal
          open={showCrop}
          image={cropImageData}
          aspect={4/5}
          onCancel={handleCropCancel}
          onCrop={handleCropDone}
        />
      )}
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-white hover:bg-white/10 rounded-full"
            disabled={loading}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-white text-lg font-semibold">Add Story</h1>
          <Button
            onClick={handlePublishStory}
            disabled={(!selectedFile && !storyText.trim()) || loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send size={16} className="mr-1" />
            {loading ? 'Sharing...' : 'Share'}
          </Button>
        </div>

        {/* Story Preview */}
        <div
          className="flex-1 relative flex items-center justify-center"
          style={{ backgroundColor }}
        >
          {selectedFile ? (
            selectedFile.type === 'image' ? (
              <img
                src={selectedFile.data}
                alt="Story"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video
                src={selectedFile.data}
                controls
                autoPlay
                className="max-w-full max-h-full object-contain"
                poster=""
              />
            )
          ) : (
            <div className="text-center text-white/70">
              <Camera size={64} className="mx-auto mb-4" />
              <p className="text-lg">Add a photo, video, or create a text story</p>
            </div>
          )}

          {/* Text Overlay */}
          {storyText && (
            <div
              className="absolute inset-0 flex items-center justify-center p-8"
              style={{ color: textColor }}
            >
              <div className="text-center text-2xl font-bold max-w-full break-words">
                {storyText}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-black/90 backdrop-blur-sm p-4 space-y-4">
          {/* Action Buttons */}
          <div className="flex justify-center space-x-6">
            <button
              onClick={handleGalleryClick}
              className="flex flex-col items-center space-y-1 text-white hover:text-primary transition-colors"
              disabled={loading}
            >
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <Image size={24} />
              </div>
              <span className="text-xs">Gallery</span>
            </button>
            <button
              onClick={() => setSelectedFile(null)}
              className="flex flex-col items-center space-y-1 text-white hover:text-primary transition-colors"
              disabled={loading}
            >
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <Type size={24} />
              </div>
              <span className="text-xs">Text</span>
            </button>
          </div>

          {/* Text Input */}
          <div className="space-y-3">
            <Textarea
              placeholder="Add text to your story..."
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder-white/60 resize-none"
              rows={3}
              disabled={loading}
            />

            {/* Color Options */}
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <span className="text-white text-sm">Text:</span>
                {colorOptions.slice(0, 5).map((color) => (
                  <button
                    key={color}
                    onClick={() => setTextColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      textColor === color ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    disabled={loading}
                  />
                ))}
              </div>

              <div className="flex space-x-2">
                <span className="text-white text-sm">Background:</span>
                {colorOptions.slice(5).map((color) => (
                  <button
                    key={color}
                    onClick={() => setBackgroundColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      backgroundColor === color ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*"
          className="hidden"
          disabled={loading}
        />
      </div>
    </>
  );
};

export default AddStory;
