import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Globe,
  FileText,
  MessageSquare,
  User,
  Settings,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const userNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Domains", href: "/domains", icon: Globe },
  { name: "Invoice", href: "/invoice", icon: FileText },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Profile", href: "/profile", icon: User },
];

const adminNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Domains", href: "/domains", icon: Globe },
  { name: "Users", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { isAdmin } = useAuth();

  const navigation = isAdmin ? adminNavigation : userNavigation;

  return (
    <div className="w-64 border-r bg-sidebar text-sidebar-foreground">
      <div className="h-14 border-b flex items-center px-6">
        <span className="text-lg font-semibold">
          {isAdmin ? "Admin Dashboard" : "LinkManager"}
        </span>
      </div>
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location === item.href
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}