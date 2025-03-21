import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Globe,
  FileText,
  MessageSquare,
  User,
  Users,
  BarChart,
  Kanban,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";

const userNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Domains", href: "/domains", icon: Globe },
  { name: "Reports", href: "/reports", icon: BarChart },
  { name: "Kanban Board", href: "/kanban", icon: Kanban },
  { name: "Invoice", href: "/invoice", icon: FileText },
  { name: "Chat with Support", href: "/chat", icon: MessageSquare },
  { name: "Profile", href: "/profile", icon: User },
];

const adminNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Domains", href: "/domains", icon: Globe },
  { name: "Reports", href: "/reports", icon: BarChart },
  { name: "Kanban Board", href: "/kanban", icon: Kanban },
  { name: "Users", href: "/users", icon: Users },
  { name: "Chat Support", href: "/chat", icon: MessageSquare },
];

export function Sidebar() {
  const [location] = useLocation();
  const { isAdmin, user } = useAuth();
  
  const navigation = isAdmin ? adminNavigation : userNavigation;

  return (
    <div className="w-16 hover:w-64 transition-all duration-300 ease-in-out border-r bg-sidebar text-sidebar-foreground group">
      <div className="h-16 border-b flex items-center justify-center group-hover:justify-start px-4">
        {user?.companyLogo ? (
          <div className="flex items-center">
            <img 
              src={user.companyLogo} 
              alt={user.companyName || "Company Logo"} 
              className="h-10 w-10 object-contain rounded" 
            />
            <span className="ml-2 text-lg font-semibold truncate hidden group-hover:inline">
              {isAdmin ? "Admin" : user.companyName}
            </span>
          </div>
        ) : (
          <div className="flex items-center">
            <Logo size="sm" showText={false} showProduct={false} />
            <span className="ml-2 text-lg font-semibold hidden group-hover:inline">
              SaaSxLinks
              {isAdmin && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  Admin
                </span>
              )}
            </span>
          </div>
        )}
      </div>
      <nav className="p-2 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                location === item.href
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5 min-w-[20px]" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                {item.name}
              </span>
              
              {/* Tooltip for when sidebar is collapsed */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded 
                pointer-events-none opacity-0 group-hover:opacity-0 hover:opacity-0
                scale-0 group-hover:scale-0 origin-left transition-all duration-200
                whitespace-nowrap">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}