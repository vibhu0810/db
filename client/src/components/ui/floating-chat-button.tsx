import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { MessageCircle, X, Clock, Plus, History, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  companyName?: string;
  is_admin: boolean;
}

/**
 * FloatingChatButton - A floating button component that appears on the bottom right of the screen
 * allowing users to quickly access admin chat support
 */
export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true); // Default to online for better UX
  
  // If user is an admin, don't show the floating chat button
  if (user?.is_admin) {
    return null;
  }

  // Get all admin users
  const { data: adminUsers } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getQueryFn<User[]>({ on401: 'returnNull' }),
    select: (users) => users.filter(u => u.is_admin),
    refetchInterval: 60000, // Refresh every minute
  });

  // Get real chat history from API
  const { data: chatHistory, isLoading: isLoadingChatHistory } = useQuery({
    queryKey: ['/api/chat/history'],
    queryFn: getQueryFn<any[]>({ on401: 'returnNull' }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Format chat history data for the UI
  const recentConversations = React.useMemo(() => {
    if (!chatHistory || chatHistory.length === 0) {
      // Default conversation if no history exists yet
      return adminUsers && adminUsers.length > 0 ? [{
        id: adminUsers[0].id,
        name: adminUsers[0].companyName || adminUsers[0].username || 'SEO Expert',
        lastMessage: 'Start a conversation with our SEO team!',
        timestamp: new Date().toISOString(),
        unread: 0
      }] : [];
    }
    
    return chatHistory.map(chat => ({
      id: chat.userId,
      name: chat.username,
      lastMessage: chat.lastMessage,
      timestamp: chat.timestamp,
      unread: chat.unread
    }));
  }, [chatHistory, adminUsers]);

  // Default to the main admin ID
  const mainAdminId = adminUsers && adminUsers.length > 0 
    ? adminUsers[0].id 
    : 133; // Fallback to ID 133
  
  const handleNewChatClick = () => {
    navigate(`/chat?user=${mainAdminId}`);
    setIsOpen(false);
  };
  
  const handleChatHistoryClick = (userId: number) => {
    navigate(`/chat?user=${userId}`);
    setIsOpen(false);
  };
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="absolute bottom-16 right-0 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border mb-2 w-80"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium flex items-center">
                <span>SEO Expert Support</span>
                <span className={`ml-2 inline-block h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-xs ml-1 text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</span>
              </h3>
              <Button 
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              Chat directly with the SEO team for any questions or assistance.
            </p>

            <Button
              onClick={handleNewChatClick}
              className="w-full flex items-center justify-center gap-2 mb-4"
            >
              <Plus className="h-4 w-4" />
              Start New Chat with SEO Expert
            </Button>

            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
              <History className="h-4 w-4" />
              <span>Recent Conversations</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentConversations.map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => handleChatHistoryClick(chat.id)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                >
                  <Avatar className="h-8 w-8">
                    <span className="font-semibold text-xs">{chat.name.substring(0, 2).toUpperCase()}</span>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-sm truncate">{chat.name}</p>
                      <span className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(chat.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>
                  </div>
                  {chat.unread > 0 && (
                    <div className="h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">
                      {chat.unread}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {adminUsers && adminUsers.length > 0 && (
              <>
                <div className="mt-4 pt-3 border-t">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                    <UserIcon className="h-4 w-4" />
                    <span>Available SEO Experts</span>
                  </div>
                  <div className="space-y-2">
                    {adminUsers.map((admin) => (
                      <div 
                        key={admin.id}
                        onClick={() => handleChatHistoryClick(admin.id)}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                      >
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <span className="font-semibold text-xs">
                              {(admin.companyName || admin.username).substring(0, 2).toUpperCase()}
                            </span>
                          </Avatar>
                          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border border-white"></div>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{admin.companyName || admin.username}</p>
                          <p className="text-xs text-green-500">Available now</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="relative">
        <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-500 border border-white z-10"></div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg"
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
        </motion.button>
      </div>
    </div>
  );
}