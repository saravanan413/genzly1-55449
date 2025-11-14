import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, PlusSquare, User, Play, MessageCircle, Menu, ArrowLeft, Heart } from 'lucide-react';
import ActivityDropdown from './ActivityDropdown';
import SwipeWrapper from './SwipeWrapper';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Define which pages should hide various UI elements
  const isChatPage = location.pathname.startsWith('/chat/') || location.pathname === '/chat';
  const isEditProfilePage = location.pathname === '/edit-profile';
  const isUserProfilePage = location.pathname.startsWith('/user/');
  const isSettingsPage = location.pathname === '/settings';
  const isAddStoryPage = location.pathname === '/add-story';
  const isStoryViewerPage = location.pathname.startsWith('/story/');

  // Pages that should hide the sidebar
  const isSidebarHiddenPage = isChatPage || isEditProfilePage || isUserProfilePage;
  const isProfilePage = location.pathname === '/profile';
  const isReelsPage = location.pathname === '/reels';
  const isCreatePage = location.pathname === '/create';

  // Show sidebar on most pages, but not on specific full-width pages
  const showSidebar = !(isSidebarHiddenPage || isProfilePage || isReelsPage || isCreatePage);

  // Hide header on certain pages
  const isHeaderHiddenPage = isChatPage || isEditProfilePage || isUserProfilePage || isReelsPage || isCreatePage;

  // Show bottom navigation on all pages EXCEPT individual chat pages
  const showBottomNav = !location.pathname.startsWith('/chat/');

  // Enable swipe navigation only on home and chat pages
  const enableSwipeNavigation = location.pathname === '/' || location.pathname === '/chat';

  const navigationItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/explore', icon: Search, label: 'Explore' },
    { path: '/create', icon: PlusSquare, label: 'Create' },
    { path: '/reels', icon: Play, label: 'Reels' },
    { path: '/chat', icon: MessageCircle, label: 'Messages' },
  ];

  const mobileBottomNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/explore', icon: Search, label: 'Explore' },
    { path: '/create', icon: PlusSquare, label: 'Create' },
    { path: '/reels', icon: Play, label: 'Reels' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const renderContent = () => {
    if (enableSwipeNavigation) {
      return (
        <SwipeWrapper>
          {children}
        </SwipeWrapper>
      );
    }
    return children;
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Desktop Sidebar */}
      {showSidebar && (
        <div className="hidden md:fixed md:left-0 md:top-0 md:h-full md:w-64 md:bg-card/80 dark:md:bg-card/80 md:backdrop-blur-md md:border-r md:border-border dark:md:border-border md:flex md:flex-col md:p-6 md:z-40">
          <Link to="/" className="flex items-center space-x-2 mb-8">
            <span className="text-xl font-bold text-foreground dark:text-foreground">Genzly</span>
          </Link>
          
          <nav className="space-y-2 flex-1">
            {navigationItems.map(({ path, icon: Icon, label }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-muted dark:hover:bg-muted ${
                  isActive(path) ? 'bg-muted dark:bg-muted text-foreground dark:text-foreground font-semibold' : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground'
                }`}
              >
                <Icon size={24} />
                <span>{label}</span>
              </Link>
            ))}
            
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-muted dark:hover:bg-muted w-full text-left ${
                    isActive('/activity') ? 'bg-muted dark:bg-muted text-foreground dark:text-foreground font-semibold' : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground'
                  }`}
                >
                  <Heart size={24} />
                  <span>Activity</span>
                </button>
              </SheetTrigger>
              <SheetContent className="w-full sm:w-96">
                <SheetHeader className="pb-6">
                  <SheetTitle className="text-xl font-bold">Activity</SheetTitle>
                </SheetHeader>
                <ActivityDropdown />
              </SheetContent>
            </Sheet>
            
            <Link
              to="/profile"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-muted dark:hover:bg-muted ${
                isActive('/profile') ? 'bg-muted dark:bg-muted text-foreground dark:text-foreground font-semibold' : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
            >
              <User size={24} />
              <span>Profile</span>
            </Link>
          </nav>
          
          <Link
            to="/settings"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-muted dark:hover:bg-muted mt-auto ${
              isActive('/settings') ? 'bg-muted dark:bg-muted text-foreground dark:text-foreground font-semibold' : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground'
            }`}
          >
            <Menu size={24} />
            <span>Settings</span>
          </Link>
        </div>
      )}

      {/* Mobile & Desktop Header */}
      {!isHeaderHiddenPage && (
        <div className="md:hidden fixed top-0 left-0 right-0 bg-card/80 dark:bg-card/80 backdrop-blur-md border-b border-border dark:border-border p-4 z-40">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-lg font-bold text-foreground dark:text-foreground">Genzly</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    className="p-2 hover:bg-muted dark:hover:bg-muted rounded-full transition-colors duration-200"
                  >
                    <Heart size={20} className="text-foreground dark:text-foreground" />
                  </button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-96">
                  <SheetHeader className="pb-6">
                    <SheetTitle className="text-xl font-bold">Activity</SheetTitle>
                  </SheetHeader>
                  <ActivityDropdown />
                </SheetContent>
              </Sheet>
              <Link to="/chat" className="p-2 hover:bg-muted dark:hover:bg-muted rounded-full transition-colors duration-200">
                <MessageCircle size={20} className="text-foreground dark:text-foreground" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${(isSidebarHiddenPage || isProfilePage || isReelsPage || isCreatePage) ? 'w-full' : 'md:ml-64'} min-h-screen`}>
        <div className={`${!isHeaderHiddenPage ? 'pt-16 md:pt-0' : 'pt-0'} ${showBottomNav ? 'pb-20 md:pb-4' : ''}`}>
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Navigation - Show on all pages except individual chat pages */}
      {showBottomNav && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/80 dark:bg-card/80 backdrop-blur-md border-t border-border dark:border-border p-2 z-40">
          <div className="flex items-center justify-around">
            {mobileBottomNavItems.map(({ path, icon: Icon, label }) => (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-all duration-200 ${
                  isActive(path) ? 'text-foreground dark:text-foreground' : 'text-muted-foreground dark:text-muted-foreground'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
