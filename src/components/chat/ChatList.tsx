import React, { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { BellOff } from 'lucide-react';
import ChatLoadingState from './ChatLoadingState';
import ChatEmptyState from './ChatEmptyState';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ChatActionsDrawer from './ChatActionsDrawer';

export interface ChatPreview {
  chatId: string;
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
  lastMessage: {
    text: string;
    timestamp: number;
    senderId: string;
    seen: boolean;
  } | null;
  unreadCount: number;
  muted?: boolean;
}

interface ChatListProps {
  chatPreviews: ChatPreview[];
  loading: boolean;
  searchQuery: string;
  currentUserId: string;
  onChatClick: (receiverId: string) => void;
  onDoubleTap: (receiverId: string) => void;
  onMuteChat: (chatId: string, mute: boolean) => void;
  onDeleteChat: (chatId: string) => void;
  onHideChat: (chatId: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({
  chatPreviews,
  loading,
  searchQuery,
  currentUserId,
  onChatClick,
  onDoubleTap,
  onMuteChat,
  onDeleteChat,
  onHideChat,
}) => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const filteredChats = useMemo(() => {
    if (!searchQuery) return chatPreviews;
    
    const lowerQuery = searchQuery.toLowerCase();
    return chatPreviews.filter(chat =>
      chat.otherUser.username?.toLowerCase().includes(lowerQuery) ||
      chat.otherUser.displayName?.toLowerCase().includes(lowerQuery)
    );
  }, [chatPreviews, searchQuery]);

  const selectedChat = useMemo(() => {
    return chatPreviews.find(chat => chat.chatId === selectedChatId);
  }, [chatPreviews, selectedChatId]);

  const handleLongPressStart = (chatId: string) => {
    const timer = setTimeout(() => {
      setSelectedChatId(chatId);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const getProfilePictureUrl = (avatar?: string): string => {
    if (avatar && avatar.trim() !== '') {
      return avatar;
    }
    return '/lovable-uploads/d349107d-a94b-4c77-9738-6efb4f4d75e5.png';
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/lovable-uploads/d349107d-a94b-4c77-9738-6efb4f4d75e5.png';
  };

  if (loading) {
    return <ChatLoadingState />;
  }

  if (filteredChats.length === 0) {
    return <ChatEmptyState searchQuery={searchQuery} />;
  }

  return (
    <>
      <div className="space-y-2">
        {filteredChats.map((chat) => {
          const isUnread = chat.lastMessage && !chat.lastMessage.seen && chat.lastMessage.senderId !== currentUserId;
          
          return (
            <div
              key={chat.chatId}
              onClick={() => onChatClick(chat.otherUser.id)}
              onDoubleClick={() => onDoubleTap(chat.otherUser.id)}
              onTouchStart={() => handleLongPressStart(chat.chatId)}
              onTouchEnd={handleLongPressEnd}
              onTouchCancel={handleLongPressEnd}
              onMouseDown={() => handleLongPressStart(chat.chatId)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800"
            >
              {/* Profile Picture */}
              <div className="relative flex-shrink-0">
                <Avatar className="w-14 h-14">
                  <AvatarImage 
                    src={getProfilePictureUrl(chat.otherUser.avatar)} 
                    alt={chat.otherUser.displayName}
                    onError={handleImageError}
                  />
                  <AvatarFallback>
                    {chat.otherUser.displayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isUnread && chat.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-medium">
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold truncate ${!chat.lastMessage?.seen && chat.lastMessage?.senderId !== currentUserId ? 'text-foreground' : 'text-foreground/70'}`}>
                      {chat.otherUser.displayName || chat.otherUser.username}
                    </h3>
                    {chat.muted && (
                      <BellOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  {chat.lastMessage && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <p className={`text-sm truncate ${isUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {chat.lastMessage?.text || 'No messages yet'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {selectedChat && (
        <ChatActionsDrawer
          open={!!selectedChatId}
          onOpenChange={(open) => !open && setSelectedChatId(null)}
          chatId={selectedChat.chatId}
          displayName={selectedChat.otherUser.displayName || selectedChat.otherUser.username || 'User'}
          isMuted={selectedChat.muted || false}
          onMute={() => onMuteChat(selectedChat.chatId, !selectedChat.muted)}
          onDelete={() => onDeleteChat(selectedChat.chatId)}
          onHide={() => onHideChat(selectedChat.chatId)}
        />
      )}
    </>
  );
};

export default ChatList;
