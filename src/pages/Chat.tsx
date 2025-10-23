import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ChatHeader from '../components/chat/ChatHeader';
import ChatList from '../components/chat/ChatList';
import NotesBar from '../components/chat/NotesBar';
import HiddenChatsDrawer from '../components/chat/HiddenChatsDrawer';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscribeToUserChatList, 
  ChatListItem, 
  clearCachedChatList,
  hydrateUserChatList 
} from '../services/chat/chatListService';
import { 
  muteChatForUser, 
  hideChatForUser, 
  deleteChatForUser,
  unhideChatForUser,
  getHiddenChatsForUser
} from '../services/chat/chatActionsService';
import { logger } from '../utils/logger';
import { toast } from '@/hooks/use-toast';

const Chat = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [likedChats, setLikedChats] = useState<string[]>([]);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHiddenChats, setShowHiddenChats] = useState(false);
  const [hiddenChatsList, setHiddenChatsList] = useState<ChatListItem[]>([]);
  const [isPulling, setIsPulling] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();

  // Subscribe to user's chat list with real-time updates and caching
  useEffect(() => {
    // Wait for auth to be initialized
    if (authLoading) {
      return;
    }

    if (!currentUser?.uid) {
      logger.debug('No current user, clearing chat list');
      setLoading(false);
      setError(null);
      setChatList([]);
      setIsFromCache(false);
      return;
    }

    logger.debug('Setting up chat list with caching', { userId: currentUser.uid });
    setLoading(true);
    setError(null);
    
    try {
      const unsubscribe = subscribeToUserChatList(currentUser.uid, (chats, fromCache) => {
        logger.debug('Chat list update received', { 
          chatCount: chats.length, 
          fromCache 
        });
        
        // Always update the full chat list (don't append, replace completely)
        // Safety guard: don't clear list on empty live snapshots
        setChatList(prev => (!fromCache && chats.length === 0 ? prev : chats));
        setIsFromCache(fromCache);
        
        // Only set loading to false after we get live data or if no cache exists
        if (!fromCache || chats.length === 0) {
          setLoading(false);
        }
        
        setError(null);
      });

      return () => {
        logger.debug('Cleaning up chat list subscription');
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (err) {
      logger.error('Failed to set up chat list subscription', err);
      setError('Failed to load chat list');
      setLoading(false);
    }
  }, [currentUser?.uid, authLoading]);

  // Clean up cache on logout - but don't clear on login
  useEffect(() => {
    if (!currentUser && !authLoading) {
      logger.debug('User logged out, preserving chat cache for next login');
      // Don't clear cache on logout - keep it for next login
    }
  }, [currentUser, authLoading]);

  const handleDoubleTap = (receiverId: string) => {
    if (!likedChats.includes(receiverId)) {
      setLikedChats(prev => [...prev, receiverId]);
      setTimeout(() => {
        setLikedChats(prev => prev.filter(id => id !== receiverId));
      }, 2000);
    }
  };

  const handleChatClick = (receiverId: string) => {
    logger.debug('Opening chat', { receiverId });
    navigate(`/chat/${receiverId}`);
  };

  const handleNewChat = () => {
    navigate('/explore');
  };

  const handleMuteChat = async (chatId: string, mute: boolean) => {
    if (!currentUser) return;
    
    try {
      await muteChatForUser(currentUser.uid, chatId, mute);
      toast({
        title: mute ? 'Chat muted' : 'Chat unmuted',
        description: mute ? 'You will not receive notifications' : 'You will receive notifications',
      });
    } catch (error) {
      logger.error('Failed to mute/unmute chat', error);
      toast({
        title: 'Error',
        description: 'Failed to update chat settings',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!currentUser) return;
    
    try {
      await deleteChatForUser(currentUser.uid, chatId);
      toast({
        title: 'Chat deleted',
        description: 'Chat has been deleted for you',
      });
    } catch (error) {
      logger.error('Failed to delete chat', error);
      toast({
        title: 'Error',
        description: 'Failed to delete chat',
        variant: 'destructive',
      });
    }
  };

  const handleHideChat = async (chatId: string) => {
    if (!currentUser) return;
    
    try {
      await hideChatForUser(currentUser.uid, chatId);
      toast({
        title: 'Chat hidden',
        description: 'Pull down to view hidden chats',
      });
    } catch (error) {
      logger.error('Failed to hide chat', error);
      toast({
        title: 'Error',
        description: 'Failed to hide chat',
        variant: 'destructive',
      });
    }
  };

  const handleUnhideChat = async (chatId: string) => {
    if (!currentUser) return;
    
    try {
      await unhideChatForUser(currentUser.uid, chatId);
      toast({
        title: 'Chat unhidden',
        description: 'Chat is now visible',
      });
    } catch (error) {
      logger.error('Failed to unhide chat', error);
      toast({
        title: 'Error',
        description: 'Failed to unhide chat',
        variant: 'destructive',
      });
    }
  };

  const loadHiddenChats = async () => {
    if (!currentUser) return;
    
    try {
      const hiddenChatIds = await getHiddenChatsForUser(currentUser.uid);
      const hidden = chatList.filter(chat => hiddenChatIds.includes(chat.chatId));
      setHiddenChatsList(hidden);
      setShowHiddenChats(true);
    } catch (error) {
      logger.error('Failed to load hidden chats', error);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY > 0) {
      const pullDistance = e.touches[0].clientY - pullStartY;
      if (pullDistance > 100 && !isPulling) {
        setIsPulling(true);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isPulling) {
      loadHiddenChats();
    }
    setPullStartY(0);
    setIsPulling(false);
  };

  // Filter out hidden chats
  const visibleChatList = chatList.filter(chat => !chat.hidden);

  // Convert ChatListItem to ChatPreview format expected by ChatList component
  const chatPreviews = visibleChatList.map(chat => ({
    chatId: chat.chatId,
    otherUser: {
      id: chat.receiverId,
      username: chat.username,
      displayName: chat.displayName,
      avatar: chat.avatar
    },
    lastMessage: chat.lastMessage ? {
      text: chat.lastMessage,
      timestamp: chat.timestamp,
      senderId: chat.lastSenderId ?? '',
      seen: chat.seen
    } : null,
    unreadCount: chat.unreadCount ?? 0,
    muted: chat.muted ?? false,
  }));

  // Show loading only if we're still loading auth or if we have no cache and no data
  const showLoading = authLoading || (loading && !isFromCache);

  if (authLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-6 w-full bg-background dark:bg-gray-900">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!currentUser) {
    return (
      <Layout>
        <div className="p-4 md:p-6 w-full bg-background dark:bg-gray-900">
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">Please log in to view your chats.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 md:p-6 w-full bg-background dark:bg-gray-900">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div 
        className="w-full bg-background dark:bg-gray-900"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-full max-w-2xl mx-auto">
          <div className="p-4 md:p-6">
            <ChatHeader onNewChat={handleNewChat} />
          </div>
          
          {isPulling && (
            <div className="text-center py-2 text-sm text-muted-foreground">
              Release to view hidden chats...
            </div>
          )}
          
          {/* Notes Bar */}
          <NotesBar />
          
          <div className="p-4 md:p-6">
            {/* Cache indicator for debugging */}
            {isFromCache && !loading && (
              <div className="mb-2 text-xs text-muted-foreground text-center">
                Showing cached chats ({chatList.length}) • Syncing...
              </div>
            )}
            
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-primary/20 placeholder-gray-500"
                />
              </div>
            </div>

            <ChatList
              chatPreviews={chatPreviews}
              loading={showLoading}
              searchQuery={searchQuery}
              currentUserId={currentUser.uid}
              onChatClick={handleChatClick}
              onDoubleTap={handleDoubleTap}
              onMuteChat={handleMuteChat}
              onDeleteChat={handleDeleteChat}
              onHideChat={handleHideChat}
            />
          </div>
        </div>

        <HiddenChatsDrawer
          open={showHiddenChats}
          onOpenChange={setShowHiddenChats}
          hiddenChats={hiddenChatsList.map(chat => ({
            chatId: chat.chatId,
            displayName: chat.displayName,
            username: chat.username,
            avatar: chat.avatar,
          }))}
          onUnhide={handleUnhideChat}
        />
      </div>
    </Layout>
  );
};

export default Chat;
