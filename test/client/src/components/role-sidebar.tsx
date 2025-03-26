import React, { useState } from 'react';
import { 
  Home, Users, Package, ClipboardList, MessageSquare, 
  Settings, LifeBuoy, BarChart, Globe, LogOut, MenuIcon,
  DollarSign, FileText, CreditCard
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { User } from '../../../shared/schema';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active: boolean;
  expanded: boolean;
  onClick?: () => void;
}

interface SidebarProps {
  user: User | null;
  expanded: boolean;
  toggle: () => void;
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
    <Link href={href}>
      <a
        className={`flex items-center p-3 my-1 rounded-md transition-colors duration-200 ${
          active
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-primary/10 text-foreground'
        }`}
        onClick={onClick}
      >
        <span className="mr-3">{icon}</span>
        {expanded && <span>{label}</span>}
      </a>
    </Link>
  );
};

export const RoleSidebar: React.FC<SidebarProps> = ({ user, expanded, toggle }) => {
  const [location] = useLocation();
  const isActive = (href: string) => location === href;

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/test/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
  
      if (response.ok) {
        window.location.href = '/test/login';
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Items visible to all roles
  const commonNavItems = [
    { icon: <Home size={20} />, label: 'Dashboard', href: '/test' },
    { icon: <ClipboardList size={20} />, label: 'My Orders', href: '/test/orders' },
    { icon: <Globe size={20} />, label: 'Domains', href: '/test/domains' },
    { icon: <MessageSquare size={20} />, label: 'Messaging', href: '/test/messages' },
    { icon: <LifeBuoy size={20} />, label: 'Support', href: '/test/support' },
  ];

  // Items visible only to admin
  const adminNavItems = [
    { icon: <Users size={20} />, label: 'User Management', href: '/test/users' },
    { icon: <Package size={20} />, label: 'Domain Management', href: '/test/admin/domains' },
    { icon: <BarChart size={20} />, label: 'Reports', href: '/test/reports' },
    { icon: <FileText size={20} />, label: 'Invoices', href: '/test/invoices' },
    { icon: <DollarSign size={20} />, label: 'Pricing Tiers', href: '/test/pricing-tiers' },
  ];

  // Items visible only to user managers
  const userManagerNavItems = [
    { icon: <Users size={20} />, label: 'My Clients', href: '/test/my-clients' },
    { icon: <ClipboardList size={20} />, label: 'Client Orders', href: '/test/client-orders' },
  ];

  // Items visible only to inventory managers
  const inventoryManagerNavItems = [
    { icon: <Package size={20} />, label: 'Domain Inventory', href: '/test/inventory' },
    { icon: <DollarSign size={20} />, label: 'Domain Pricing', href: '/test/domain-pricing' },
  ];

  // Filter navbar items based on user role
  let navItems = [...commonNavItems];

  if (user) {
    if (user.is_admin) {
      navItems = [...navItems, ...adminNavItems];
    } else if (user.role === 'user_manager') {
      navItems = [...navItems, ...userManagerNavItems];
    } else if (user.role === 'inventory_manager') {
      navItems = [...navItems, ...inventoryManagerNavItems];
    }
  }

  // Always add settings at the end
  navItems.push({ icon: <Settings size={20} />, label: 'Settings', href: '/test/settings' });

  return (
    <div
      className={`flex flex-col h-screen bg-card border-r transition-all duration-300 ${
        expanded ? 'w-64' : 'w-16'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {expanded ? (
          <div className="flex items-center gap-2">
            <img 
              src="/test/assets/logo.svg" 
              alt="Logo" 
              className="h-8 w-8" 
            />
            <span className="font-bold text-lg">SaaSxLinks</span>
          </div>
        ) : (
          <img 
            src="/test/assets/logo-sm.svg" 
            alt="Logo" 
            className="h-8 w-8 mx-auto" 
          />
        )}
        <button 
          onClick={toggle}
          className="p-1 rounded-md hover:bg-accent"
        >
          <MenuIcon size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={isActive(item.href)}
              expanded={expanded}
            />
          ))}
        </nav>
      </div>

      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center w-full p-2 rounded-md hover:bg-primary/10 transition-colors duration-200"
        >
          <LogOut size={20} className="mr-3" />
          {expanded && <span>Log out</span>}
        </button>
      </div>

      {user && expanded && (
        <div className="p-4 border-t flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
            {user.firstName?.[0] || user.username[0]}
          </div>
          <div className="overflow-hidden">
            <p className="font-medium truncate">{user.firstName || user.username}</p>
            <p className="text-sm text-muted-foreground truncate">
              {user.is_admin ? 'Admin' : user.role.replace('_', ' ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSidebar;