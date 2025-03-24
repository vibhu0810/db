import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { MessageCircle, X, Clock, Plus, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';

interface ChatHistory {
  userId: number;
  username: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

interface User {
  id: number;
  username: string;
  is_admin: boolean;
  lastActive?: string;
}

/**
 * FloatingChatButton - A floating button component that appears on the bottom right of the screen
 * allowing users to quickly access admin chat support
 */
export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [onlineAdmins, setOnlineAdmins] = useState<User[]>([]);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  
  // If user is an admin, don't show the floating chat button
  if (user?.is_admin) {
    return null;
  }
  
  // Admin user ID - in a production app, this would be dynamically fetched
  const adminId = 133;

  // Get all users to check which admins are online
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getQueryFn<User[]>({ on401: 'returnNull' }),
  });

  // Get chat histories
  const { data: chatData } = useQuery({
    queryKey: ['/api/chat/history'],
    queryFn: getQueryFn<ChatHistory[]>({ on401: 'returnNull' }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (users) {
      // Find admin users who are online (active in the last 5 minutes)
      const admins = users.filter(u => u.is_admin && u.lastActive);
      const onlineAdminsList = admins.filter(admin => {
        const lastActive = new Date(admin.lastActive || '');
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        return lastActive > fiveMinutesAgo;
      });
      
      setOnlineAdmins(onlineAdminsList);
      setIsOnline(onlineAdminsList.length > 0);
    }
  }, [users]);

  useEffect(() => {
    if (chatData) {
      setChatHistories(chatData);
    }
  }, [chatData]);
  
  const handleNewChatClick = () => {
    navigate(`/chat?user=${adminId}`);
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
              <h3 className="font-medium">SEO Expert Support</h3>
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

            {chatHistories && chatHistories.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <History className="h-4 w-4" />
                  <span>Recent Conversations</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {chatHistories.map((chat) => (
                    <div 
                      key={chat.userId}
                      onClick={() => handleChatHistoryClick(chat.userId)}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                    >
                      <Avatar className="h-8 w-8">
                        <span className="font-semibold text-xs">{chat.username.substring(0, 2).toUpperCase()}</span>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-sm truncate">{chat.username}</p>
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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="relative">
        {isOnline && (
          <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-500 border border-white z-10"></div>
        )}
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