import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image, Film, X, Send, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/services/imageUpload';
import { useAuth } from '@/contexts/AuthContext';

type MediaType = 'image' | 'video' | null;
type ContentType = 'post' | 'reel';

interface SelectedMedia {
  type: 'image' | 'video';
  data: string;
  file: File;
}

const CreatePost = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [contentType, setContentType] = useState<ContentType>('post');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [caption, setCaption] = useState('');
const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast({
        title: "Invalid file type",
        description: "Please select an image or video file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (100MB max per storage rules)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 100MB",
        variant: "destructive"
      });
      return;
    }

    // Auto-switch content type based on media
    if (isVideo) {
      setContentType('reel');
    } else {
      setContentType('post');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedMedia({
          type: isImage ? 'image' : 'video',
          data: event.target.result as string,
          file
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const openGallery = (type: 'image' | 'video') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
      fileInputRef.current.click();
    }
  };

  const clearMedia = () => {
    setSelectedMedia(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePost = async () => {
    if (!selectedMedia) {
      toast({
        title: "No media selected",
        description: "Please select an image or video to share",
        variant: "destructive"
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Not logged in",
        description: "Please log in to create a post",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const folder = contentType === 'reel' ? 'reels' : 'posts';
      
      const downloadUrl = await uploadImage({
        file: selectedMedia.file,
        folder,
        onProgress: (percent) => setUploadProgress(percent),
      });

      console.log('Upload complete:', { downloadUrl, caption, type: contentType });

      toast({
        title: contentType === 'post' ? "Post shared!" : "Reel shared!",
        description: `Your ${contentType} has been shared successfully`,
      });

      navigate('/');
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload your content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-accent"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-semibold">Create</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePost}
            disabled={!selectedMedia || loading}
            className="text-primary font-semibold hover:bg-primary/10"
          >
            {loading ? (
              <div className="animate-spin rounded-full w-4 h-4 border-2 border-primary border-t-transparent" />
            ) : (
              'Share'
            )}
          </Button>
        </div>
      </div>

      {/* Content Type Selector */}
      <div className="px-4 py-3 border-b border-border">
        <div className="max-w-xl mx-auto">
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setContentType('post')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                contentType === 'post'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Image className="w-4 h-4 inline-block mr-2" />
              Post
            </button>
            <button
              onClick={() => setContentType('reel')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                contentType === 'reel'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Film className="w-4 h-4 inline-block mr-2" />
              Reel
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-6">
        <div className="max-w-xl mx-auto">
          {!selectedMedia ? (
            /* Media Selection Area */
            <div className="space-y-6">
              {/* Upload Area */}
              <div 
                onClick={() => openGallery(contentType === 'post' ? 'image' : 'video')}
                className="aspect-square rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all duration-300 group"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  {contentType === 'post' ? (
                    <Image className="w-10 h-10 text-primary" />
                  ) : (
                    <Film className="w-10 h-10 text-primary" />
                  )}
                </div>
                <p className="text-lg font-medium text-foreground mb-1">
                  {contentType === 'post' ? 'Select a photo' : 'Select a video'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Tap to choose from gallery
                </p>
              </div>

              {/* Quick Tips */}
              <div className="bg-muted/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Quick tips</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2">
                  {contentType === 'post' ? (
                    <>
                      <li>• Use high-quality images for better engagement</li>
                      <li>• Square or portrait photos work best</li>
                      <li>• Add a caption to tell your story</li>
                    </>
                  ) : (
                    <>
                      <li>• Vertical videos perform better (9:16)</li>
                      <li>• Keep it under 60 seconds for best results</li>
                      <li>• Use trending sounds to boost reach</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            /* Media Preview & Caption */
            <div className="space-y-4">
              {/* Media Preview */}
              <div className="relative rounded-2xl overflow-hidden bg-muted">
                <button
                  onClick={clearMedia}
                  className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                {selectedMedia.type === 'image' ? (
                  <img
                    src={selectedMedia.data}
                    alt="Preview"
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <video
                    src={selectedMedia.data}
                    controls
                    className="w-full aspect-[9/16] max-h-[500px] object-cover"
                  />
                )}
              </div>

              {/* Caption Input */}
              <div className="bg-muted/30 rounded-xl p-4">
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={`Write a caption for your ${contentType}...`}
                  className="min-h-[100px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base"
                  maxLength={2200}
                />
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Add hashtags to reach more people
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {caption.length}/2200
                  </span>
                </div>
              </div>

              {/* Share Button */}
                {loading ? (
                  <div className="space-y-3">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={handlePost}
                    className="w-full h-12 text-base font-semibold rounded-xl"
                    size="lg"
                  >
                    <div className="flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      <span>Share {contentType === 'post' ? 'Post' : 'Reel'}</span>
                    </div>
                  </Button>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default CreatePost;
