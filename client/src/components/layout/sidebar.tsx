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
  Settings,
  Wrench,
  Star,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";
import { useSidebar } from "@/hooks/use-sidebar";
import { usePendingFeedback } from "@/hooks/use-pending-feedback";

const userNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Domains", href: "/domains", icon: Globe },
  { name: "Reports", href: "/reports", icon: BarChart },
  { name: "Kanban Board", href: "/kanban", icon: Kanban },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Feedback", href: "/feedback", icon: Star },
  { name: "Chat with Support", href: "/chat", icon: MessageSquare },
  { name: "Profile", href: "/profile", icon: User },
];

const adminNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Domains", href: "/domains", icon: Globe },
  { name: "User Domains", href: "/admin/user-domains", icon: Globe },
  { name: "Reports", href: "/reports", icon: BarChart },
  { name: "Kanban Board", href: "/kanban", icon: Kanban },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Users", href: "/users", icon: Users },
  { name: "Feedback", href: "/feedback", icon: Star },
  { name: "Chat Support", href: "/chat", icon: MessageSquare },
  { name: "Profile", href: "/profile", icon: User },
];

export function Sidebar() {
  const [location] = useLocation();
  const { isAdmin, user } = useAuth();
  const { expanded } = useSidebar();
  const { hasPendingFeedback } = usePendingFeedback();
  
  const navigation = isAdmin ? adminNavigation : userNavigation;

  return (
    <div 
      className={cn(
        "sidebar-container border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
        expanded ? "w-64" : "w-20 group"
      )}
    >
      <div className="h-28 border-b flex flex-col items-center justify-center px-2 py-3">
        {user?.profilePicture ? (
          <>
            <div className="flex justify-center w-full">
              <div className="relative">
                <img 
                  src={user.profilePicture} 
                  alt={user.firstName || "Profile"} 
                  className="h-20 w-20 object-cover rounded-full shadow-lg" 
                />
                {isAdmin && !expanded && (
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground border border-background">
                    A
                  </span>
                )}
              </div>
            </div>
            <div className={cn(
              "mt-1 text-center transition-opacity duration-300 w-full",
              expanded ? "block" : "hidden"
            )}>
              <div className="text-sm font-semibold truncate">
                {user.firstName} {user.lastName}
                {isAdmin && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center w-full">
            <Logo size="sm" showText={false} showProduct={false} />
            <span className={cn(
              "ml-2 text-lg font-semibold transition-opacity duration-300",
              expanded ? "opacity-100 inline" : "hidden"
            )}>
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
                "flex items-center rounded-md text-sm font-medium transition-colors relative",
                expanded ? "gap-3 px-3 py-2 justify-start" : "justify-center py-3",
                location === item.href
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("min-w-[20px]", expanded ? "h-5 w-5" : "h-6 w-6")} />
                {item.name === "Feedback" && hasPendingFeedback && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </div>
              <span className={cn(
                "transition-opacity duration-300 whitespace-nowrap",
                expanded ? "opacity-100 inline" : "hidden"
              )}>
                {item.name}
                {item.name === "Feedback" && hasPendingFeedback && (
                  <span className="ml-2 text-xs font-medium text-red-500">New</span>
                )}
              </span>
              
              {/* Tooltip removed as requested */}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}