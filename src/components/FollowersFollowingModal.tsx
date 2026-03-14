
import React, { useState, useEffect, useMemo } from "react";
import { X, Search } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getFollowers, getFollowing, FollowData, unfollowUser, removeFollower } from '../services/follow';
import { useAuth } from '../contexts/AuthContext';

interface FollowersFollowingModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "followers" | "following";
  userId?: string;
}

const FollowersFollowingModal: React.FC<FollowersFollowingModalProps> = ({
  isOpen,
  onClose,
  type,
  userId
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<FollowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const targetUserId = userId || currentUser?.uid;
  const isOwnProfile = targetUserId === currentUser?.uid;

  useEffect(() => {
    if (isOpen && targetUserId) {
      fetchUsers();
    }
  }, [isOpen, type, targetUserId]);

  const fetchUsers = async () => {
    if (!targetUserId) return;
    
    setLoading(true);
    
    try {
      let followData: FollowData[] = [];
      
      if (type === 'followers') {
        followData = await getFollowers(targetUserId);
      } else {
        followData = await getFollowing(targetUserId);
      }
      
      setUsers(followData);
      console.log(`Loaded ${followData.length} ${type} for user:`, targetUserId);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      toast({
        title: "Error",
        description: `Failed to load ${type}. Please try again.`,
        variant: "destructive",
        duration: 3000
      });
      setUsers([]);
    }
    setLoading(false);
  };

  const handleUserClick = (userId: string) => {
    onClose();
    if (userId === currentUser?.uid) {
      navigate('/profile');
    } else {
      navigate(`/user/${userId}`);
    }
  };

  const handleRemoveFollower = async (followerUserId: string) => {
    if (!currentUser || !followerUserId) {
      console.error('Missing required data for remove follower');
      toast({
        title: "Error",
        description: "Missing user information",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    console.log('Handle remove follower called with:', {
      currentUserId: currentUser.uid,
      followerUserId: followerUserId
    });
    
    setActionLoading(followerUserId);
    
    try {
      console.log('Attempting to remove follower:', followerUserId);
      const success = await removeFollower(currentUser.uid, followerUserId);
      
      if (success) {
        toast({
          title: "Success",
          description: "Follower removed successfully",
          duration: 3000
        });
        // Refresh the list
        await fetchUsers();
      } else {
        console.error('Remove follower operation returned false');
        toast({
          title: "Error",
          description: "Failed to remove follower. Please try again.",
          variant: "destructive",
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error in remove follower operation:', error);
      toast({
        title: "Error",
        description: `Failed to remove follower: ${error.message || 'Unknown error'}`,
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfollowUser = async (followedUserId: string) => {
    if (!currentUser || !followedUserId) {
      console.error('Missing required data for unfollow');
      toast({
        title: "Error",
        description: "Missing user information",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    console.log('Handle unfollow called with:', {
      currentUserId: currentUser.uid,
      followedUserId: followedUserId
    });
    
    setActionLoading(followedUserId);
    
    try {
      console.log('Attempting to unfollow user:', followedUserId);
      const success = await unfollowUser(currentUser.uid, followedUserId);
      
      if (success) {
        toast({
          title: "Success",
          description: "Unfollowed successfully",
          duration: 3000
        });
        // Refresh the list
        await fetchUsers();
      } else {
        console.error('Unfollow operation returned false');
        toast({
          title: "Error",
          description: "Failed to unfollow user. Please try again.",
          variant: "destructive",
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error in unfollow operation:', error);
      toast({
        title: "Error",
        description: `Failed to unfollow: ${error.message || 'Unknown error'}`,
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Generate default avatar
  const getFallbackAvatar = (): string => {
    return '/lovable-uploads/07e28f82-bd38-410c-a208-5db174616626.png';
  };

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter((followData) => {
      const userInfo = type === 'followers' ? followData.followerInfo : followData.followedInfo;
      return (
        userInfo.username?.toLowerCase().includes(query) ||
        userInfo.displayName?.toLowerCase().includes(query)
      );
    });
  }, [users, searchQuery, type]);

  // Reset search when modal opens/closes
  useEffect(() => {
    if (!isOpen) setSearchQuery('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-background rounded-2xl shadow-xl overflow-hidden animate-slide-in-bottom flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg capitalize">
            {type} ({users.length})
          </h2>
          <button onClick={onClose} className="hover:bg-muted p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading {type}...</p>
            </div>
          ) : users.length > 0 ? (
            <div className="divide-y">
              {users.map((followData) => {
                const userInfo = type === 'followers' ? followData.followerInfo : followData.followedInfo;
                const userId = type === 'followers' ? followData.followerId : followData.followedId;
                const avatarUrl = userInfo.avatar || getFallbackAvatar();
                const isCurrentUser = userId === currentUser?.uid;
                const isLoadingAction = actionLoading === userId;
                
                return (
                  <div 
                    key={userId} 
                    className="flex items-center px-4 py-3 gap-3 hover:bg-muted transition"
                  >
                    <div 
                      className="w-11 h-11 rounded-full flex-shrink-0 cursor-pointer"
                      onClick={() => handleUserClick(userId)}
                    >
                      <img 
                        src={avatarUrl} 
                        alt={userInfo.username} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleUserClick(userId)}
                    >
                      <div className="font-medium text-foreground truncate">
                        {userInfo.username || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {userInfo.displayName || userInfo.username || 'Unknown User'}
                      </div>
                    </div>
                    
                    {/* Action buttons - only show if it's the current user's profile and not themselves */}
                    {isOwnProfile && !isCurrentUser && (
                      <div className="flex-shrink-0">
                        {type === 'followers' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFollower(userId)}
                            disabled={isLoadingAction}
                            className="text-xs px-3 py-1 h-7"
                          >
                            {isLoadingAction ? 'Removing...' : 'Remove'}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnfollowUser(userId)}
                            disabled={isLoadingAction}
                            className="text-xs px-3 py-1 h-7"
                          >
                            {isLoadingAction ? 'Unfollowing...' : 'Unfollow'}
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Show timestamp if no action buttons */}
                    {(!isOwnProfile || isCurrentUser) && (
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {followData.timestamp ? new Date(followData.timestamp.toDate()).toLocaleDateString() : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-10">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👤</span>
              </div>
              <p className="text-sm">No {type} yet</p>
              <p className="text-xs mt-1">
                {type === 'followers' 
                  ? 'When people follow this account, they\'ll appear here.' 
                  : 'When this account follows people, they\'ll appear here.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowersFollowingModal;
