
export interface ChatUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: FirebaseTimestamp | number;
  status: 'sending' | 'sent' | 'delivered' | 'seen';
  delivered: boolean;
  seen: boolean;
  type: 'text' | 'voice' | 'image' | 'video';
  mediaURL?: string;
}

export interface ChatListMetadata {
  lastMessage: string;
  timestamp: number;
  userInfo: {
    name: string;
    profileImage?: string;
  };
  seen: boolean;
}

export interface SharedContent {
  type: 'post' | 'reel' | 'image' | 'video' | 'profile';
  url?: string;
  image?: string;
  caption?: string;
  meta?: Record<string, unknown>;
  postId?: number;
}

export interface MessageContent {
  url: string;
  type: string;
}

export interface DisplayMessage {
  id: string;
  text: string;
  time: string;
  isOwn: boolean;
  content?: MessageContent;
  type?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'seen';
  delivered?: boolean;
  seen?: boolean;
  timestamp?: FirebaseTimestamp | number;
}

// Firebase Firestore timestamp type
export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

// Chat list item interface
export interface ChatListItem {
  chatId: string;
  receiverId: string;
  username: string;
  displayName: string;
  avatar?: string;
  lastMessage: string;
  timestamp: number;
  seen: boolean;
  muted?: boolean;
  hidden?: boolean;
  lastSenderId?: string;
  unreadCount?: number;
}

// User profile interface for chat context
export interface ChatUserProfile {
  id: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  email?: string;
  bio?: string;
  isOnline?: boolean;
}

// Media upload interface
export interface MediaUpload {
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  name: string;
  file?: File;
}

// Chat preview interface
export interface ChatPreview {
  chatId: string;
  otherUser: ChatUserProfile;
  lastMessage: {
    text: string;
    timestamp: FirebaseTimestamp | number;
    senderId: string;
    seen: boolean;
  } | null;
  unreadCount: number;
}
