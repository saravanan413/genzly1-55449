
import React, { useState, useRef } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';

interface MessageInputProps {
  newMessage: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onSendMedia: (media: { type: 'image' | 'video' | 'audio' | 'file'; url: string; name: string; file?: File }) => void;
  disabled?: boolean;
  error?: string | null;
}

const MessageInput: React.FC<MessageInputProps> = ({
  newMessage,
  onMessageChange,
  onSendMessage,
  onSendMedia,
  disabled = false,
  error = null
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && newMessage.trim()) {
        onSendMessage();
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    let type: 'image' | 'video' | 'audio' | 'file' = 'file';
    
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onSendMedia({
        type,
        url: result,
        name: file.name,
        file
      });
    };
    reader.readAsDataURL(file);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVoiceSend = (audioBlob: Blob, duration: number) => {
    const reader = new FileReader();
    reader.onload = () => {
      onSendMedia({
        type: 'audio',
        url: reader.result as string,
        name: `voice-message-${Date.now()}.wav`,
        file: new File([audioBlob], `voice-message-${Date.now()}.wav`, { type: 'audio/wav' })
      });
    };
    reader.readAsDataURL(audioBlob);
  };

  return (
    <div className="p-4 border-t border-border bg-card dark:bg-gray-800">
      {error && (
        <div className="mb-3 flex items-center space-x-2 text-red-500 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      <div className="flex items-center space-x-3">

        {/* Text input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? "Sending..." : "Message..."}
            disabled={disabled}
            className="w-full px-4 py-2 bg-muted dark:bg-gray-700 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary border-0 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        
        {/* Voice recorder */}
        <VoiceRecorder onSendVoice={handleVoiceSend} disabled={disabled} />
        
        {/* Send button */}
        <button
          onClick={onSendMessage}
          disabled={!newMessage.trim() || disabled}
          className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
