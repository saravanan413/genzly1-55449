
import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, MessageSquare, Share, Eye } from 'lucide-react';

interface Story {
  id: number;
  image: string;
  timestamp: string;
}

interface UserInfo {
  name: string;
  avatar: string;
}

interface InstagramStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserInfo;
  stories: Story[];
  initialIndex: number;
  onIndexChange?: (i: number) => void;
  onWatchedStory?: (id: number) => void;
  getViewCount?: (storyId: number) => number;
}

const AUTO_PROGRESS_DURATION = 20000; // 20 seconds

const InstagramStoryModal: React.FC<InstagramStoryModalProps> = ({
  isOpen,
  onClose,
  user,
  stories,
  initialIndex,
  onIndexChange,
  onWatchedStory,
  getViewCount,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex || 0);
  }, [initialIndex]);

  useEffect(() => {
    if (!isOpen) return;
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);

    if (!paused) {
      progressRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            handleNext();
            return 0;
          }
          return prev + 2;
        });
      }, AUTO_PROGRESS_DURATION / 50);
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isOpen, currentIndex, paused]);

  useEffect(() => {
    if (onIndexChange) {
      onIndexChange(currentIndex);
    }
    if (onWatchedStory && stories[currentIndex]) {
      onWatchedStory(stories[currentIndex].id);
    }
  }, [currentIndex]);

  const handlePrev = () => {
    setProgress(0);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setProgress(0);
    // If last story, close the modal
    if (currentIndex >= stories.length - 1) {
      onClose();
    } else {
      setCurrentIndex((prev) => (prev < stories.length - 1 ? prev + 1 : prev));
    }
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, width } = (e.target as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - left;
    if (x < width / 2) handlePrev();
    else handleNext();
  };

  const story = stories[currentIndex];
  const viewCount = getViewCount ? getViewCount(story.id) : 0;
  
  // Mock viewers data for demo
  const mockViewers = [
    { username: 'sarah_jones', avatar: 'https://via.placeholder.com/40/FF69B4/FFFFFF?Text=S', viewedAt: Date.now() - 60000 },
    { username: 'mike_photo', avatar: 'https://via.placeholder.com/40/4169E1/FFFFFF?Text=M', viewedAt: Date.now() - 120000 },
    { username: 'jane_travel', avatar: 'https://via.placeholder.com/40/32CD32/FFFFFF?Text=J', viewedAt: Date.now() - 180000 },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-[9999] inset-0 bg-black flex items-center justify-center animate-fade-in w-screen h-screen"
      style={{
        width: '100vw',
        height: '100vh',
        left: 0,
        top: 0,
        padding: 0,
        margin: 0,
      }}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Progress bar */}
        <div className="absolute top-3 left-0 right-0 z-20 flex gap-1 px-4 sm:px-6">
          {stories.map((_, i) => (
            <div key={i} className="h-1 bg-white/25 rounded flex-1 overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-150"
                style={{
                  width:
                    i < currentIndex
                      ? '100%'
                      : i === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 left-4 sm:left-6 z-30 flex items-center gap-2">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white shadow"
          />
          <div>
            <div className="text-white font-semibold text-sm">{user.name}</div>
            <div className="text-xs text-gray-300 flex items-center gap-2">
              <span>{story.timestamp}</span>
              {viewCount > 0 && (
                <button
                  onClick={() => setShowViewers(true)}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <Eye size={12} />
                  <span>{viewCount}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-4 sm:right-6 z-30 p-1.5 bg-black/40 hover:bg-black/70 rounded-full transition-colors"
        >
          <X className="text-white w-6 h-6 sm:w-7 sm:h-7" />
        </button>

        {/* Story content */}
        <div
          className="absolute inset-0 z-0 select-none"
          style={{ WebkitTapHighlightColor: "transparent", cursor: "pointer" }}
          onClick={handleTap}
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          <img
            src={story.image}
            alt=""
            draggable={false}
            className="w-full h-full object-cover select-none transition-transform duration-500"
            style={{ objectPosition: "center" }}
          />
          
          {/* Navigation arrows */}
          {currentIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute top-1/2 left-2 sm:left-4 -translate-y-1/2 z-30 p-1.5 bg-black/30 hover:bg-black/70 rounded-full transition-colors"
            >
              <ChevronLeft className="text-white w-7 h-7 sm:w-8 sm:h-8" />
            </button>
          )}
          
          {currentIndex < stories.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute top-1/2 right-2 sm:right-4 -translate-y-1/2 z-30 p-1.5 bg-black/30 hover:bg-black/70 rounded-full transition-colors"
            >
              <ChevronRight className="text-white w-7 h-7 sm:w-8 sm:h-8" />
            </button>
          )}
        </div>

        {/* Reply/share bar (bottom) */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 sm:p-6 z-20 flex flex-col gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <input
              className="flex-1 bg-black/40 border border-white/20 rounded-full px-3 sm:px-4 py-2 text-white text-sm sm:text-base placeholder-white focus:outline-none focus:ring-2 focus:border-white/60"
              placeholder="Send message..."
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
            />
            <button
              className="bg-black/60 hover:bg-black/90 rounded-full text-white p-2 transition-colors"
              title="Send Comment"
            >
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button 
              className="bg-black/60 hover:bg-black/90 rounded-full text-white p-2 transition-colors" 
              title="Share Story"
            >
              <Share className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Viewers Modal */}
        {showViewers && (
          <div className="absolute inset-0 z-40 bg-black/80 flex items-end">
            <div className="w-full bg-gray-900 rounded-t-2xl max-h-[70vh] overflow-hidden">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-white font-semibold">Story Views ({viewCount})</h3>
                <button
                  onClick={() => setShowViewers(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {mockViewers.map((viewer, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={viewer.avatar}
                        alt={viewer.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <span className="text-white text-sm">{viewer.username}</span>
                    </div>
                    <span className="text-gray-400 text-xs">
                      {Math.floor((Date.now() - viewer.viewedAt) / 60000)}m ago
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstagramStoryModal;
