import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

/**
 * FloatingChatButton - A floating button component that appears on the bottom right of the screen
 * allowing users to quickly access admin chat support
 */
export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // If user is an admin, don't show the floating chat button
  if (user?.is_admin) {
    return null;
  }
  
  // Admin user ID - in a production app, this would be dynamically fetched
  const adminId = 133;
  
  const handleChatClick = () => {
    navigate(`/chat?user=${adminId}`);
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
            className="absolute bottom-16 right-0 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border mb-2 w-64"
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
              onClick={handleChatClick}
              className="w-full"
            >
              Chat with SEO Expert
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
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
  );
}