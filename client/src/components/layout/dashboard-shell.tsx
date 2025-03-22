import { Sidebar } from "./sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { NotificationsDropdown } from "@/components/ui/notifications";
import { SidebarProvider, useSidebar } from "@/hooks/use-sidebar";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// Internal component to access the sidebar context
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const { toggle, expanded } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-6">
          {/* Left side of header with hamburger icon for desktop only */}
          <div className="flex items-center gap-2">
            {!isMobile && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggle} 
                aria-label="Toggle sidebar"
                className="lg:flex hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
          
          {/* Right side of header with user info */}
          <div className="flex items-center gap-4 ml-auto">
            <NotificationsDropdown />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <Link href="/profile">
                <Button variant="ghost" className="text-sm">
                  {user?.companyName || user?.username}
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => logoutMutation.mutate()}
                className="text-sm"
              >
                Logout
              </Button>
            </div>
          </div>
        </header>
        
        {/* Main content with more padding on left to account for compact sidebar */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Wrapper component that provides the sidebar context
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}