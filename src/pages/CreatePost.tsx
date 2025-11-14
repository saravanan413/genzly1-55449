import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CreatePost = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-accent"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-semibold">Create Post</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center mb-6">
          <Camera className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Post Creation Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          We're working on bringing you an amazing post creation experience. Stay tuned!
        </p>
      </div>
    </div>
  );
};

export default CreatePost;
