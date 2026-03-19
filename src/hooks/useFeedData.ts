
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Post } from '../types/index';
import { createLikeNotification, createCommentNotification } from '../services/unifiedNotificationService';

interface UseFeedDataProps {
  pageSize?: number;
  userId?: string;
  category?: string;
}

// Define the Firestore document data structure
interface FirestorePostData {
  userId: string;
  username: string;
  userAvatar?: string;
  displayName?: string;
  mediaURL: string;
  mediaType: 'image' | 'video';
  caption: string;
  timestamp: any;
  privacy?: string;
  followersOnly?: boolean;
  likeCount: number;
  commentCount: number;
  location?: string;
  category?: string;
}

function mapPostDoc(docSnap: any): Post {
  const data = docSnap.data() as FirestorePostData;
  return {
    id: docSnap.id,
    userId: data.userId || '',
    username: data.username || '',
    userAvatar: data.userAvatar,
    mediaURL: data.mediaURL || '',
    mediaType: data.mediaType || 'image',
    caption: data.caption || '',
    timestamp: data.timestamp,
    likes: [],
    likeCount: data.likeCount || 0,
    comments: [],
    commentCount: data.commentCount || 0,
    location: data.location,
    category: data.category,
    user: {
      username: data.username || 'unknown',
      displayName: data.displayName || 'Unknown User',
      avatar: data.userAvatar,
    },
  } as Post;
}

export const useFeedData = ({ pageSize = 20, userId, category }: UseFeedDataProps = {}) => {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch the current user's following list
  useEffect(() => {
    if (!currentUser) return;

    const followingRef = collection(db, 'users', currentUser.uid, 'following');
    const unsub = onSnapshot(followingRef, (snap) => {
      setFollowingList(snap.docs.map((d) => d.id));
    });

    return () => unsub();
  }, [currentUser]);

  // Real-time listener for posts
  useEffect(() => {
    setLoading(true);
    setError(null);

    let q;
    if (userId) {
      // Profile page: show all posts for this user
      q = query(
        collection(db, 'posts'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );
    } else if (category) {
      q = query(
        collection(db, 'posts'),
        where('category', '==', category),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );
    } else {
      // Home feed: fetch all, filter client-side for privacy
      q = query(
        collection(db, 'posts'),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );
    }

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        let allPosts = snapshot.docs.map(mapPostDoc);

        // Apply privacy filtering for home feed (not profile page)
        if (!userId && !category && currentUser) {
          allPosts = allPosts.filter((post) => {
            // Own posts always visible
            if (post.userId === currentUser.uid) return true;
            // Public posts always visible
            const data = snapshot.docs.find((d) => d.id === post.id)?.data() as FirestorePostData | undefined;
            if (!data) return true;
            if (data.privacy === 'public' || !data.privacy) return true;
            // Private posts only visible if current user follows the poster
            if (data.privacy === 'private' || data.followersOnly) {
              return followingList.includes(post.userId);
            }
            return true;
          });
        }

        setPosts(allPosts);
        setHasMore(false); // Real-time listener handles all updates
        setLoading(false);
      },
      (err) => {
        console.error('[useFeedData] Snapshot error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [pageSize, userId, category, currentUser, followingList]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // onSnapshot auto-refreshes, just toggle indicator
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleLike = async (postId: string) => {
    console.log('Liking post:', postId);
  };

  const handleFollow = async (userId: string) => {
    console.log('Following user:', userId);
  };

  const handleDoubleClick = async (postId: string) => {
    console.log('Double clicked post:', postId);
  };

  const createLikeNotificationForPost = async (postOwnerId: string, postId: string) => {
    if (currentUser?.uid) {
      await createLikeNotification(postOwnerId, currentUser.uid, postId);
    }
  };

  const createCommentNotificationForPost = async (postOwnerId: string, postId: string, commentText?: string) => {
    if (currentUser?.uid) {
      await createCommentNotification(postOwnerId, currentUser.uid, postId, commentText);
    }
  };

  return {
    posts,
    loading,
    hasMore,
    error: error || '',
    refreshing,
    fetchMoreData: () => {},
    loadMorePosts: () => {},
    handleRefresh,
    handleLike,
    handleFollow,
    handleDoubleClick,
    createLikeNotification: createLikeNotificationForPost,
    createCommentNotification: createCommentNotificationForPost,
  };
};
