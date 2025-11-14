
import React, { useState, useEffect } from 'react';
import { X, Heart, Send } from 'lucide-react';
import { Story } from '../../types/story';

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  currentUserId: string;
}

const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  initialIndex,
  onClose,
  currentUserId
}) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const currentStory = stories[currentStoryIndex];

  useEffect(() => {
    if (!isPlaying) return;

    const duration = 5000; // 5 seconds per story
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (duration / 100));
        if (newProgress >= 100) {
          if (currentStoryIndex < stories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentStoryIndex, stories.length, isPlaying, onClose]);

  const goToNext = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goToPrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex space-x-1 z-10">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded">
            <div
              className="h-full bg-white rounded transition-all duration-100"
              style={{
                width: index < currentStoryIndex ? '100%' : 
                       index === currentStoryIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <img
            src={currentStory.avatar || '/placeholder.svg'}
            alt={currentStory.displayName}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <p className="text-white font-semibold text-sm">{currentStory.displayName}</p>
            <p className="text-white/70 text-xs">
              {new Date(currentStory.createdAt?.toDate()).toLocaleString()}
            </p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="p-2 text-white hover:bg-white/20 rounded-full"
        >
          <X size={24} />
        </button>
      </div>

      {/* Story content */}
      <div className="w-full h-full flex items-center justify-center">
        {currentStory.mediaUrl ? (
          currentStory.mediaType === 'image' ? (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="max-w-full max-h-full object-contain"
              onClick={() => setIsPlaying(!isPlaying)}
            />
          ) : (
            <video
              src={currentStory.mediaUrl}
              autoPlay
              muted
              className="max-w-full max-h-full object-contain"
              onClick={() => setIsPlaying(!isPlaying)}
            />
          )
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: currentStory.backgroundColor }}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {currentStory.text}
          </div>
        )}
      </div>

      {/* Navigation areas */}
      <div
        className="absolute left-0 top-0 w-1/3 h-full cursor-pointer"
        onClick={goToPrevious}
      />
      <div
        className="absolute right-0 top-0 w-1/3 h-full cursor-pointer"
        onClick={goToNext}
      />

      {/* Bottom actions */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center space-x-3 z-10">
        <input
          type="text"
          placeholder={`Reply to ${currentStory.displayName}...`}
          className="flex-1 px-4 py-2 bg-white/20 text-white placeholder-white/70 rounded-full focus:outline-none focus:bg-white/30"
        />
        <button className="p-2 text-white hover:bg-white/20 rounded-full">
          <Heart size={24} />
        </button>
        <button className="p-2 text-white hover:bg-white/20 rounded-full">
          <Send size={24} />
        </button>
      </div>
    </div>
  );
};

export default StoryViewer;
