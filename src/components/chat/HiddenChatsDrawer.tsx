import { Eye } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HiddenChat {
  chatId: string;
  displayName: string;
  username: string;
  avatar?: string;
}

interface HiddenChatsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hiddenChats: HiddenChat[];
  onUnhide: (chatId: string) => void;
}

const HiddenChatsDrawer = ({
  open,
  onOpenChange,
  hiddenChats,
  onUnhide,
}: HiddenChatsDrawerProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-center">Hidden Chats</DrawerTitle>
        </DrawerHeader>
        
        <div className="pb-6 max-h-[60vh] overflow-y-auto">
          {hiddenChats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hidden chats
            </div>
          ) : (
            hiddenChats.map((chat) => (
              <div
                key={chat.chatId}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={chat.avatar} alt={chat.displayName} />
                    <AvatarFallback>
                      {chat.displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{chat.displayName}</p>
                    <p className="text-sm text-muted-foreground">@{chat.username}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    onUnhide(chat.chatId);
                    if (hiddenChats.length === 1) {
                      onOpenChange(false);
                    }
                  }}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                  aria-label="Unhide chat"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default HiddenChatsDrawer;
