import React, { useState, useEffect } from 'react';
import { RoleSidebar } from './role-sidebar';
import { useLocation, useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface RoleDashboardLayoutProps {
  children: React.ReactNode;
}

const RoleDashboardLayout: React.FC<RoleDashboardLayoutProps> = ({ children }) => {
  const [expanded, setExpanded] = useState(true);
  const [location] = useLocation();
  const [isLoginPage] = useRoute('/test/login');
  const [isRegisterPage] = useRoute('/test/register');
  
  // Toggle sidebar expansion state
  const toggleSidebar = () => {
    setExpanded(!expanded);
    // Save preference to localStorage
    localStorage.setItem('sidebar-expanded', String(!expanded));
  };
  
  // Load sidebar expansion preference from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-expanded');
    if (savedState !== null) {
      setExpanded(savedState === 'true');
    }
  }, []);
  
  // Fetch current user data
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/test/user'],
    retry: false,
  });
  
  // If on login or register page, don't show the layout
  if (isLoginPage || isRegisterPage) {
    return <>{children}</>;
  }
  
  // Check if the user is not authenticated - redirect to login if not
  useEffect(() => {
    if (!isLoading && !user && !isLoginPage && !isRegisterPage) {
      window.location.href = '/test/login';
    }
  }, [user, isLoading, isLoginPage, isRegisterPage]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar component */}
      <RoleSidebar
        user={user}
        expanded={expanded}
        toggle={toggleSidebar}
      />
      
      {/* Main content area */}
      <main className={`flex-1 overflow-auto transition-all duration-300 ${expanded ? 'ml-64' : 'ml-20'}`}>
        {isLoading ? (
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              There was an error loading data. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        ) : (
          <div className="p-6">{children}</div>
        )}
      </main>
    </div>
  );
};

export default RoleDashboardLayout;