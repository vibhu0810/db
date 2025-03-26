import React, { useState, useEffect } from 'react';
import RoleSidebar from './role-sidebar';
import { Bell, Search, Menu } from 'lucide-react';
import { User } from '../../../shared/schema';

interface RoleDashboardLayoutProps {
  children: React.ReactNode;
}

export const RoleDashboardLayout: React.FC<RoleDashboardLayoutProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Track screen size for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && expanded) {
        setExpanded(false);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [expanded]);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/test/user', {
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Redirect to login if not authenticated
          window.location.href = '/test/login';
          return;
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Fetch notifications count
  useEffect(() => {
    if (user) {
      const fetchNotifications = async () => {
        try {
          const response = await fetch('/api/test/notifications', {
            credentials: 'include',
          });

          if (response.ok) {
            const notificationsData = await response.json();
            const unread = notificationsData.filter(
              (notification: any) => !notification.isRead
            ).length;
            setUnreadNotifications(unread);
          }
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      };

      fetchNotifications();

      // Refresh notifications every minute
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className={`hidden md:block ${mobileMenuOpen ? 'z-50' : ''}`}>
        <RoleSidebar
          user={user}
          expanded={expanded}
          toggle={toggleSidebar}
        />
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div 
            className="fixed inset-0 bg-black/50"
            onClick={toggleMobileMenu}
          ></div>
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card">
            <RoleSidebar
              user={user}
              expanded={true}
              toggle={toggleMobileMenu}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b bg-card">
          <div className="flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="p-2 mr-2 rounded-md hover:bg-accent md:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="relative flex items-center max-w-md w-full">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-full border rounded-md bg-background"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button className="p-2 rounded-md hover:bg-accent">
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 text-xs flex items-center justify-center bg-red-500 text-white rounded-full">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                {user?.firstName?.[0] || user?.username?.[0] || 'U'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{user?.firstName || user?.username}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.is_admin ? 'Admin' : user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
};

export default RoleDashboardLayout;