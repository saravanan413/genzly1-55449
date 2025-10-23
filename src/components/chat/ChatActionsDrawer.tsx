import { Bell, BellOff, Trash2, EyeOff } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface ChatActionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  displayName: string;
  isMuted: boolean;
  onMute: () => void;
  onDelete: () => void;
  onHide: () => void;
}

const ChatActionsDrawer = ({
  open,
  onOpenChange,
  displayName,
  isMuted,
  onMute,
  onDelete,
  onHide,
}: ChatActionsDrawerProps) => {
  const handleAction = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-center">{displayName}</DrawerTitle>
        </DrawerHeader>
        
        <div className="pb-6">
          <button
            onClick={() => handleAction(onMute)}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-muted/50 transition-colors"
          >
            {isMuted ? (
              <>
                <Bell className="w-5 h-5" />
                <span>Unmute</span>
              </>
            ) : (
              <>
                <BellOff className="w-5 h-5" />
                <span>Mute</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleAction(onHide)}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-muted/50 transition-colors"
          >
            <EyeOff className="w-5 h-5" />
            <span>Hide</span>
          </button>

          <button
            onClick={() => handleAction(onDelete)}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-muted/50 transition-colors text-destructive"
          >
            <Trash2 className="w-5 h-5" />
            <span>Delete</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ChatActionsDrawer;
