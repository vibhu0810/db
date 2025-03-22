import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let badgeClasses = '';
  
  switch (status) {
    case 'Completed':
      badgeClasses = 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-500';
      break;
    case 'In Progress':
      badgeClasses = 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-500';
      break;
    case 'Sent to Editor':
      badgeClasses = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-500';
      break;
    case 'Approved':
      badgeClasses = 'bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-500';
      break;
    case 'Rejected':
    case 'Cancelled':
      badgeClasses = 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-500';
      break;
    default:
      badgeClasses = 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-500';
  }

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        badgeClasses,
        className
      )}
    >
      {status}
    </span>
  );
}