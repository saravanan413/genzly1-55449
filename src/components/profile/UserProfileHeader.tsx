import React, { useState } from 'react';
import { ArrowLeft, MessageCircle, MoreVertical, Shield, ShieldOff, Eye, Info, Share } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '../../services/firestoreService';
import { blockUser, unblockUser } from '../../services/privacy/privacyService';
import { useAuth } from '../../contexts/AuthContext';
import ReportModal from '../ReportModal';

// Generate a consistent 10-digit ID from Firebase UID
const generateUserDisplayId = (firebaseUid?: string): string => {
  if (!firebaseUid) return '0000000000';
  
  // Create a simple hash from the UID to generate a consistent 10-digit number
  let hash = 0;
  for (let i = 0; i < firebaseUid.length; i++) {
    const char = firebaseUid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Make it positive and pad to exactly 10 digits
  const positiveHash = Math.abs(hash);
  const numStr = positiveHash.toString().padStart(10, '0');
  return numStr.slice(0, 10);
};

// Format join date
const formatJoinDate = (timestamp?: any): string => {
  if (!timestamp) return 'Recently joined';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return 'Recently joined';
  }
};

// Check if account is inactive (no login for 90+ days)
const getAccountStatus = (lastActive?: any): { status: string; isActive: boolean } => {
  if (!lastActive) return { status: 'Active', isActive: true };
  
  try {
    const lastActiveDate = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 90) {
      return { status: 'Currently inactive', isActive: false };
    }
    return { status: 'Active', isActive: true };
  } catch {
    return { status: 'Active', isActive: true };
  }
};

interface UserProfileHeaderProps {
  user: UserProfile;
  isOwnProfile: boolean;
  isFollowing: boolean;
  hasFollowRequest?: boolean;
  isBlocked?: boolean;
  loading: boolean;
  followCounts: { followers: number; following: number };
  userPostsLength: number;
  onFollowClick: () => void;
  onMessageClick: () => void;
  onShareClick: () => void;
  onConnectionsClick: (tab: "followers" | "following") => void;
}

const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  user,
  isOwnProfile,
  isFollowing,
  hasFollowRequest = false,
  isBlocked = false,
  loading,
  followCounts,
  userPostsLength,
  onFollowClick,
  onMessageClick,
  onShareClick,
  onConnectionsClick
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [blockLoading, setBlockLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const handleBlockUser = async () => {
    if (!currentUser || !user?.id || blockLoading) {
      console.log('Block operation aborted - missing requirements');
      return;
    }
    
    setBlockLoading(true);
    console.log('Starting block/unblock operation for user:', user.id);
    
    try {
      let result;
      if (isBlocked) {
        console.log('Attempting to unblock user...');
        result = await unblockUser(currentUser.uid, user.id);
      } else {
        console.log('Attempting to block user...');
        result = await blockUser(currentUser.uid, user.id);
      }
      
      console.log('Block/unblock result:', result);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
          duration: 3000
        });
      } else {
        toast({
          title: "Error", 
          description: result.message,
          variant: "destructive",
          duration: 5000
        });
      }
    } catch (error: any) {
      console.error('Unexpected error in block/unblock operation:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setBlockLoading(false);
    }
  };

  // Generate default avatar
  const getFallbackAvatar = () => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || user?.username || 'User')}&background=ccc&color=333`;
  };

  const avatarUrl = user?.avatar || getFallbackAvatar();

  // Determine follow button state
  const getFollowButtonText = () => {
    if (loading) return 'Loading...';
    if (isFollowing) return 'Following';
    if (hasFollowRequest) return 'Requested';
    return 'Follow';
  };

  const getFollowButtonVariant = () => {
    if (isFollowing || hasFollowRequest) return 'outline';
    return 'default';
  };

  // Determine if Message button should be shown
  // Hide for private accounts when user is not following (request not accepted)
  const shouldShowMessageButton = () => {
    // Always show for own profile (though this case shouldn't occur)
    if (isOwnProfile) return false;
    
    // Always show for public accounts
    if (!user?.isPrivate) return true;
    
    // For private accounts, only show if following (request accepted)
    return isFollowing;
  };

  return (
    <>
      <div className="flex flex-col items-center text-center px-4 py-6">
        {/* Back Button - Top Left */}
        <div className="w-full flex justify-start mb-4">
          <Link 
            to="/explore" 
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm md:text-base">Back</span>
          </Link>
          
          {/* 3-dot Menu - Top Right (only for other users) */}
          {!isOwnProfile && (
            <div className="ml-auto">
              <Sheet open={showMoreSheet} onOpenChange={setShowMoreSheet}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2"
                    aria-label="More options"
                  >
                    <MoreVertical size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-auto">
                  <SheetHeader>
                    <SheetTitle>Profile Options</SheetTitle>
                  </SheetHeader>
                  <div className="py-6 space-y-4">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left h-12"
                      onClick={() => {
                        handleBlockUser();
                        setShowMoreSheet(false);
                      }}
                      disabled={blockLoading}
                    >
                      {isBlocked ? (
                        <>
                          <ShieldOff className="mr-3 h-5 w-5" />
                          Unblock
                        </>
                      ) : (
                        <>
                          <Shield className="mr-3 h-5 w-5" />
                          Block
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left h-12"
                      onClick={() => {
                        setShowReportModal(true);
                        setShowMoreSheet(false);
                      }}
                    >
                      <Shield className="mr-3 h-5 w-5" />
                      Report
                    </Button>
                    
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left h-12"
                      onClick={() => {
                        toast({
                          title: "Restrict",
                          description: "This feature is coming soon.",
                          duration: 3000
                        });
                        setShowMoreSheet(false);
                      }}
                    >
                      <Eye className="mr-3 h-5 w-5" />
                      Restrict
                    </Button>
                    
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left h-12"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `@${user?.username} on Genzly`,
                            text: `Check out @${user?.username}'s profile`,
                            url: window.location.href
                          }).catch(console.error);
                        } else {
                          onShareClick();
                        }
                        setShowMoreSheet(false);
                      }}
                    >
                      <Share className="mr-3 h-5 w-5" />
                      Share This Profile
                    </Button>
                    
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left h-12"
                      onClick={() => {
                        setShowAboutModal(true);
                        setShowMoreSheet(false);
                      }}
                    >
                      <Info className="mr-3 h-5 w-5" />
                      About This Account
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>

        {/* Profile Picture */}
        <div className="mb-4">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-primary/20 p-1">
            <img
              src={avatarUrl}
              alt={user?.displayName || user?.username}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>

        {/* Username */}
        <h1 className="text-xl md:text-2xl font-semibold mb-4">@{user?.username}</h1>

        {/* Follow and Message Buttons */}
        {!isOwnProfile && (
          <div className="flex space-x-3 mb-6">
            <Button 
              variant={getFollowButtonVariant()} 
              className="px-8 py-2 rounded-full"
              onClick={onFollowClick}
              disabled={loading || isBlocked}
            >
              {getFollowButtonText()}
            </Button>
            {shouldShowMessageButton() && (
              <Button 
                variant="outline" 
                className="px-6 py-2 rounded-full"
                onClick={onMessageClick}
                disabled={isBlocked}
              >
                <MessageCircle size={16} className="mr-2" />
                Message
              </Button>
            )}
          </div>
        )}

        {/* Show blocked message if user is blocked */}
        {isBlocked && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You have blocked this user. They cannot see your profile or send you messages.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="flex justify-center space-x-12 mb-6">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold">{userPostsLength}</div>
            <div className="text-sm md:text-base text-muted-foreground">Posts</div>
          </div>
          <div className="text-center">
            <div
              className="text-xl md:text-2xl font-bold cursor-pointer hover:underline text-primary"
              onClick={() => onConnectionsClick("followers")}
            >
              {followCounts.followers}
            </div>
            <div className="text-sm md:text-base text-muted-foreground cursor-pointer" onClick={() => onConnectionsClick("followers")}>
              Followers
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-xl md:text-2xl font-bold cursor-pointer hover:underline text-primary"
              onClick={() => onConnectionsClick("following")}
            >
              {followCounts.following}
            </div>
            <div className="text-sm md:text-base text-muted-foreground cursor-pointer" onClick={() => onConnectionsClick("following")}>
              Following
            </div>
          </div>
        </div>

        {/* Name and Bio */}
        <div className="max-w-xs md:max-w-sm">
          <h2 className="font-semibold text-lg mb-2">{user.displayName || user.username}</h2>
          {user.bio ? (
            <p className="text-sm md:text-base text-muted-foreground whitespace-pre-line mb-2">
              {user.bio}
            </p>
          ) : (
            <p className="text-sm md:text-base text-muted-foreground mb-2">
              No bio yet
            </p>
          )}
          {user.externalLink && (
            <a 
              href={user.externalLink.startsWith('http') ? user.externalLink : `https://${user.externalLink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm md:text-base text-primary hover:underline"
            >
              {user.externalLink}
            </a>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        type="user"
        targetUserId={user?.id}
        targetUsername={user?.username}
      />

      {/* About This Account Modal */}
      <Dialog open={showAboutModal} onOpenChange={setShowAboutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>About this account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full border-2 border-primary/20 p-0.5">
                <img
                  src={avatarUrl}
                  alt={user?.displayName || user?.username}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-medium">@{user?.username}</h3>
                <p className="text-sm text-muted-foreground">{user?.displayName || 'No display name'}</p>
              </div>
            </div>
            
            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Username:</span>
                <span className="text-sm">@{user?.username}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="text-sm">{user?.displayName || user?.username || 'Not set'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">User ID:</span>
                <span className="text-sm font-mono">{generateUserDisplayId(user?.id)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Account type:</span>
                <span className="text-sm">{user?.isPrivate ? 'Private' : 'Personal'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Joined:</span>
                <span className="text-sm">{formatJoinDate((user as any)?.createdAt)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Login method:</span>
                <span className="text-sm">Email</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Account status:</span>
                {(() => {
                  const { status, isActive } = getAccountStatus((user as any)?.lastActive);
                  return (
                    <span className={`text-sm ${isActive ? 'text-green-600' : 'text-orange-500'}`}>
                      {status}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserProfileHeader;
