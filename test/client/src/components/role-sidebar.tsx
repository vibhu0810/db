import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ShoppingCart, Users, CreditCard, 
  LogOut, ChevronLeft, ChevronRight, Globe, BarChart2,
  MessageSquare, Settings, HelpCircle, User, Bell,
  Layers, Database, CircleDollarSign, FileText, Mail
} from 'lucide-react';
import { useLocation } from 'wouter';

interface User {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  profilePicture?: string;
  role?: 'admin' | 'user_manager' | 'inventory_manager' | 'user';
  is_admin?: boolean;
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active: boolean;
  expanded: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon, 
  label, 
  href, 
  active, 
  expanded,
  onClick 
}) => {
  return (
    <a
      href={href}
      className={`flex items-center py-3 px-4 rounded-lg text-sm transition-colors ${
        active 
          ? 'bg-primary text-primary-foreground' 
          : 'hover:bg-primary/10 text-foreground'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className="mr-3">{icon}</div>
        {expanded && <span>{label}</span>}
      </div>
    </a>
  );
};

interface SidebarProps {
  user: User | null;
  expanded: boolean;
  toggle: () => void;
}

export const RoleSidebar: React.FC<SidebarProps> = ({ user, expanded, toggle }) => {
  const [location] = useLocation();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  
  // Load unread notification count
  useEffect(() => {
    async function loadNotifications() {
      try {
        const response = await fetch('/api/test/notifications/unread-count');
        if (response.ok) {
          const data = await response.json();
          setUnreadNotificationCount(data.count);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
    
    if (user) {
      loadNotifications();
      // Set up notification polling
      const interval = setInterval(loadNotifications, 60000); // Poll every minute
      return () => clearInterval(interval);
    }
  }, [user]);
  
  // Get role - either from role field or from is_admin flag
  const userRole = user?.role || (user?.is_admin ? 'admin' : 'user');
  
  // Base menu items for all roles
  const baseMenuItems = [
    {
      label: 'Profile Settings',
      icon: <Settings size={20} />,
      href: '/test/profile',
      roles: ['admin', 'user_manager', 'inventory_manager', 'user']
    },
    {
      label: 'Notifications',
      icon: <div className="relative">
        <Bell size={20} />
        {unreadNotificationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
          </span>
        )}
      </div>,
      href: '/test/notifications',
      roles: ['admin', 'user_manager', 'inventory_manager', 'user']
    },
    {
      label: 'Support',
      icon: <HelpCircle size={20} />,
      href: '/test/support',
      roles: ['admin', 'user_manager', 'inventory_manager', 'user']
    },
    {
      label: 'Logout',
      icon: <LogOut size={20} />,
      href: '/test/logout',
      roles: ['admin', 'user_manager', 'inventory_manager', 'user']
    }
  ];
  
  // Admin role menu items
  const adminMenuItems = [
    {
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      href: '/test/admin/dashboard',
      roles: ['admin']
    },
    {
      label: 'Orders',
      icon: <ShoppingCart size={20} />,
      href: '/test/admin/orders',
      roles: ['admin']
    },
    {
      label: 'Clients',
      icon: <Users size={20} />,
      href: '/test/admin/clients',
      roles: ['admin']
    },
    {
      label: 'Staff',
      icon: <User size={20} />,
      href: '/test/admin/staff',
      roles: ['admin']
    },
    {
      label: 'Domain Inventory',
      icon: <Globe size={20} />,
      href: '/test/admin/domains',
      roles: ['admin']
    },
    {
      label: 'Invoices',
      icon: <CircleDollarSign size={20} />,
      href: '/test/admin/invoices',
      roles: ['admin']
    },
    {
      label: 'Reports',
      icon: <BarChart2 size={20} />,
      href: '/test/admin/reports',
      roles: ['admin']
    },
    {
      label: 'Support Tickets',
      icon: <MessageSquare size={20} />,
      href: '/test/admin/support',
      roles: ['admin']
    },
    {
      label: 'Feedback',
      icon: <BarChart2 size={20} />,
      href: '/test/admin/feedback',
      roles: ['admin']
    },
    {
      label: 'Email Manager',
      icon: <Mail size={20} />,
      href: '/test/admin/email',
      roles: ['admin']
    },
    {
      label: 'System Settings',
      icon: <Settings size={20} />,
      href: '/test/admin/settings',
      roles: ['admin']
    },
  ];
  
  // User Manager menu items
  const userManagerMenuItems = [
    {
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      href: '/test/manager/dashboard',
      roles: ['user_manager']
    },
    {
      label: 'Clients',
      icon: <Users size={20} />,
      href: '/test/manager/clients',
      roles: ['user_manager']
    },
    {
      label: 'Orders',
      icon: <ShoppingCart size={20} />,
      href: '/test/manager/orders',
      roles: ['user_manager']
    },
    {
      label: 'Support Tickets',
      icon: <MessageSquare size={20} />,
      href: '/test/manager/support',
      roles: ['user_manager']
    },
    {
      label: 'Reports',
      icon: <BarChart2 size={20} />,
      href: '/test/manager/reports',
      roles: ['user_manager']
    },
  ];
  
  // Inventory Manager menu items
  const inventoryManagerMenuItems = [
    {
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      href: '/test/inventory/dashboard',
      roles: ['inventory_manager']
    },
    {
      label: 'Domain Inventory',
      icon: <Globe size={20} />,
      href: '/test/inventory/domains',
      roles: ['inventory_manager']
    },
    {
      label: 'Add Domain',
      icon: <Layers size={20} />,
      href: '/test/inventory/domains/add',
      roles: ['inventory_manager']
    },
    {
      label: 'Domain Metrics',
      icon: <Database size={20} />,
      href: '/test/inventory/metrics',
      roles: ['inventory_manager']
    },
    {
      label: 'Import Domains',
      icon: <FileText size={20} />,
      href: '/test/inventory/import',
      roles: ['inventory_manager']
    },
  ];
  
  // Regular user menu items
  const userMenuItems = [
    {
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      href: '/test/dashboard',
      roles: ['user']
    },
    {
      label: 'Orders',
      icon: <ShoppingCart size={20} />,
      href: '/test/orders',
      roles: ['user']
    },
    {
      label: 'New Order',
      icon: <Layers size={20} />,
      href: '/test/orders/new',
      roles: ['user']
    },
    {
      label: 'Domain Catalog',
      icon: <Globe size={20} />,
      href: '/test/domains',
      roles: ['user']
    },
    {
      label: 'Invoices',
      icon: <CreditCard size={20} />,
      href: '/test/invoices',
      roles: ['user']
    },
    {
      label: 'Support Tickets',
      icon: <MessageSquare size={20} />,
      href: '/test/support',
      roles: ['user']
    },
  ];
  
  // Combine all menu items based on user role
  let menuItems = [];
  if (userRole === 'admin') {
    menuItems = [...adminMenuItems];
  } else if (userRole === 'user_manager') {
    menuItems = [...userManagerMenuItems];
  } else if (userRole === 'inventory_manager') {
    menuItems = [...inventoryManagerMenuItems];
  } else {
    menuItems = [...userMenuItems];
  }
  
  // Add base menu items
  menuItems = [...menuItems, ...baseMenuItems.filter(item => item.roles.includes(userRole))];
  
  return (
    <div className={`h-screen bg-card border-r flex flex-col transition-all duration-300 ${
      expanded ? 'w-64' : 'w-20'
    }`}>
      {/* Sidebar header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground">
            <Globe size={20} />
          </div>
          {expanded && (
            <h1 className="ml-3 text-lg font-bold">SaaS×Links</h1>
          )}
        </div>
        <button 
          onClick={toggle}
          className="p-1 rounded-lg hover:bg-muted"
        >
          {expanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
      
      {/* User profile */}
      <div className={`p-4 border-b flex ${expanded ? 'items-start' : 'justify-center'}`}>
        {user ? (
          <div className={`flex ${expanded ? 'items-start' : 'flex-col items-center'}`}>
            <div className="flex-shrink-0">
              {user.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt={`${user.firstName || user.username}'s profile`}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User size={20} />
                </div>
              )}
            </div>
            {expanded && (
              <div className="ml-3">
                <p className="font-medium truncate max-w-[160px]">
                  {user.firstName 
                    ? `${user.firstName} ${user.lastName || ''}`
                    : user.username
                  }
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                  {user.email}
                </p>
                <p className="text-xs capitalize mt-1">
                  <span className="px-2 py-0.5 bg-primary/10 rounded-full text-primary">
                    {userRole === 'user_manager' 
                      ? 'User Manager' 
                      : userRole === 'inventory_manager'
                        ? 'Inventory Manager'
                        : userRole
                    }
                  </span>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
            {expanded && (
              <div className="ml-3 space-y-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                <div className="h-3 w-32 bg-muted rounded animate-pulse"></div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Menu items */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item, index) => (
          <SidebarItem
            key={index}
            icon={item.icon}
            label={item.label}
            href={item.href}
            active={location === item.href}
            expanded={expanded}
          />
        ))}
      </div>
      
      {/* App version */}
      <div className="p-4 text-center text-xs text-muted-foreground border-t">
        {expanded ? 'v1.0.0 • Multi-Role Edition' : 'v1.0.0'}
      </div>
    </div>
  );
};