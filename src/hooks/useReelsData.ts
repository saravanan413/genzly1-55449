
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { likeReel, unlikeReel, checkIfLiked } from '../services/postReactionsService';
import { useAuth } from '../contexts/AuthContext';
import { Reel } from '../types';

export const useReelsData = (pageSize = 20) => {
  const { currentUser } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'reels'),
      orderBy('timestamp', 'desc'),
      limit(pageSize)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const transformedReels = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: parseInt(docSnap.id) || Math.floor(Math.random() * 1000000),
              user: {
                name: data.username || 'unknown',
                avatar: data.userAvatar || '/placeholder.svg',
                isFollowing: false,
              },
              videoUrl: data.videoURL || data.mediaURL || '',
              videoThumbnail: data.thumbnailURL || '',
              caption: data.caption || '',
              likes: data.likeCount || 0,
              comments: data.commentCount || 0,
              shares: data.shares || 0,
              music: data.music || 'Original Audio',
              isLiked: false,
              isSaved: false,
              userId: data.userId,
              username: data.username,
              userAvatar: data.userAvatar,
              videoURL: data.videoURL || data.mediaURL,
              timestamp: data.timestamp,
              likeCount: data.likeCount || 0,
              commentCount: data.commentCount || 0,
              isFollowing: false,
              _privacy: data.privacy, // internal use
            } as Reel & { _privacy?: string };
          })
          // Only show public reels
          .filter((r: any) => !r._privacy || r._privacy === 'public')
          .map(({ _privacy, ...r }: any) => r as Reel);

        setReels(transformedReels);
        setLoading(false);
      },
      (err) => {
        console.error('[useReelsData] Error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [pageSize]);

  const handleLike = async (reelId: string) => {
    if (!currentUser) return;

    try {
      const reel = reels.find((r) => r.id.toString() === reelId);
      if (!reel) return;

      if (reel.isLiked) {
        await unlikeReel(reel.userId || reel.id.toString(), currentUser.uid);
      } else {
        await likeReel(reel.userId || reel.id.toString(), currentUser.uid);
      }

      setReels((prev) =>
        prev.map((r) =>
          r.id.toString() === reelId
            ? { ...r, isLiked: !r.isLiked, likes: r.isLiked ? r.likes - 1 : r.likes + 1 }
            : r
        )
      );
    } catch (error) {
      console.error('Error liking reel:', error);
    }
  };

  const handleSave = async (reelId: string) => {
    console.log('Saving reel:', reelId);
  };

  const handleFollow = async (username: string) => {
    console.log('Following user:', username);
  };

  const loadMoreReels = () => {};

  return {
    reels,
    loading,
    hasMore,
    error,
    loadMoreReels,
    handleLike,
    handleSave,
    handleFollow,
  };
};
