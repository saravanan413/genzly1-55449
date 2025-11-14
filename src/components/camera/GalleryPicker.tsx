
import React, { useRef } from 'react';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface GalleryPickerProps {
  onMediaSelected: (media: { type: 'image' | 'video', data: string, file: File }) => void;
  onBack: () => void;
}

const GalleryPicker: React.FC<GalleryPickerProps> = ({ onMediaSelected, onBack }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
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

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onMediaSelected({
          type: isImage ? 'image' : 'video',
          data: event.target.result as string,
          file
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-lg font-semibold">Select from Gallery</h1>
        <div className="w-10" />
      </div>

      {/* Gallery Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen size={32} className="text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Choose a photo or video</h2>
          <p className="text-muted-foreground mb-6">Select from your device's gallery</p>
          <Button onClick={openFilePicker} size="lg">
            Browse Files
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default GalleryPicker;
