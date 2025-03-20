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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";

const userNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Domains", href: "/domains", icon: Globe },
  { name: "Reports", href: "/reports", icon: BarChart },
  { name: "Invoice", href: "/invoice", icon: FileText },
  { name: "Chat with Support", href: "/chat", icon: MessageSquare },
  { name: "Profile", href: "/profile", icon: User },
];

const adminNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Domains", href: "/domains", icon: Globe },
  { name: "Reports", href: "/reports", icon: BarChart },
  { name: "Users", href: "/users", icon: Users },
  { name: "Chat Support", href: "/chat", icon: MessageSquare },
];

export function Sidebar() {
  const [location] = useLocation();
  const { isAdmin, user } = useAuth();

  const navigation = isAdmin ? adminNavigation : userNavigation;

  return (
    <div className="w-64 border-r bg-sidebar text-sidebar-foreground">
      <div className="h-16 border-b flex items-center px-4">
        {user?.companyLogo ? (
          <div className="flex items-center">
            <img 
              src={user.companyLogo} 
              alt={user.companyName || "Company Logo"} 
              className="h-10 max-w-[120px] object-contain mr-2" 
            />
            <span className="text-lg font-semibold truncate">
              {isAdmin ? "Admin" : ""}
            </span>
          </div>
        ) : (
          <div className="flex items-center">
            <Logo size="lg" showText={true} showProduct={false} />
            {isAdmin && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                Admin
              </span>
            )}
          </div>
        )}
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