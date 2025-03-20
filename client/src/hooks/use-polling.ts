import { useEffect } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

/**
 * A hook that sets up polling for notifications and comments
 * This is an alternative to WebSockets, using React Query's refetch mechanism
 */
export function usePolling(options?: { pollingInterval?: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const interval = options?.pollingInterval || 10000; // Default to 10 seconds

  useEffect(() => {
    if (!user) return;

    console.log('Setting up polling with interval:', interval);
    
    // Set up polling for orders to check for new comments
    const ordersPolling = setInterval(() => {
      // Refetch orders to update unread comment counts
      queryClient.invalidateQueries({ 
        queryKey: ['/api/orders'] 
      });
      
      // We don't want to toast here, as it would be too noisy
      // with regular polling. Users will see updated unread counts
    }, interval);
    
    // Set up polling for notifications
    const notificationsPolling = setInterval(() => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/notifications'] 
      });
    }, interval);
    
    // If we're on an order details page, also poll for comments
    const pathname = window.location.pathname;
    const orderIdMatch = pathname.match(/\/orders\/(\d+)/);
    
    let orderCommentsPolling: NodeJS.Timeout | undefined;
    
    if (orderIdMatch && orderIdMatch[1]) {
      const orderId = orderIdMatch[1];
      orderCommentsPolling = setInterval(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/orders', orderId, 'comments'] 
        });
      }, interval);
    }
    
    // Clean up all intervals when unmounting
    return () => {
      clearInterval(ordersPolling);
      clearInterval(notificationsPolling);
      if (orderCommentsPolling) {
        clearInterval(orderCommentsPolling);
      }
    };
  }, [user, interval, toast]);
}