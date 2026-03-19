
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  getUserProfile,
  getFollowStats,
  getActiveStories,
  Post,
  Reel,
  Story,
  UserProfile
} from '../services/firestoreService';

/**
 * Real-time feed posts for Explore page — only public posts
 */
export const useFeedPosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setLoading(true);

    const q = query(
      collection(db, 'posts'),
      where('privacy', 'in', ['public', '']),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    // Fallback query without privacy filter (for posts without privacy field)
    const qFallback = query(
      collection(db, 'posts'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(
      qFallback,
      (snapshot) => {
        const allPosts = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              user: {
                username: data.username || 'unknown',
                displayName: data.displayName || 'Unknown User',
                avatar: data.userAvatar,
              },
            } as Post;
          })
          // Client-side filter: only public or unset privacy
          .filter((post) => {
            const raw = snapshot.docs.find((d) => d.id === post.id)?.data();
            return !raw?.privacy || raw.privacy === 'public';
          });

        setPosts(allPosts);
        setLoading(false);
      },
      (err) => {
        console.error('[useFeedPosts] Error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return {
    posts,
    loading,
    hasMore,
    refreshPosts: () => {},
    loadMorePosts: () => {},
  };
};

/**
 * Real-time user posts for profile pages
 */
export const useUserPosts = (userId: string) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'posts'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const userPosts = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            user: {
              username: data.username || 'unknown',
              displayName: data.displayName || 'Unknown User',
              avatar: data.userAvatar,
            },
          } as Post;
        });
        setPosts(userPosts);
        setLoading(false);
      },
      (err) => {
        console.error('[useUserPosts] Error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  return { posts, loading };
};

export const useReels = () => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setLoading(true);

    const q = query(
      collection(db, 'reels'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const allReels = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              videoURL: data.videoURL || data.mediaURL,
              user: {
                username: data.username || 'unknown',
                displayName: data.displayName || 'Unknown User',
                avatar: data.userAvatar,
              },
            } as Reel;
          })
          // Only public reels
          .filter((reel) => {
            const raw = snapshot.docs.find((d) => d.id === reel.id)?.data();
            return !raw?.privacy || raw.privacy === 'public';
          });

        setReels(allReels);
        setLoading(false);
      },
      (err) => {
        console.error('[useReels] Error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return {
    reels,
    loading,
    hasMore,
    loadMoreReels: () => {},
  };
};

export const useStories = () => {
  const [stories, setStories] = useState<{ [userId: string]: Story[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStories = async () => {
      setLoading(true);
      try {
        const activeStories = await getActiveStories();
        setStories(activeStories);
      } catch (error) {
        console.error('Error loading stories:', error);
      }
      setLoading(false);
    };

    loadStories();
    
    // Refresh stories every 5 minutes
    const interval = setInterval(loadStories, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { stories, loading };
};

export const useUserProfile = (userId: string) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const userProfile = await getUserProfile(userId);
        if (userProfile) {
          const followStats = await getFollowStats(userId);
          setProfile({ ...userProfile, ...followStats });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
      setLoading(false);
    };

    loadProfile();
  }, [userId]);

  return { profile, loading };
};
