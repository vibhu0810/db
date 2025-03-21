import { Sidebar } from "./sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { NotificationsDropdown } from "@/components/ui/notifications";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="flex h-screen bg-background">
      {/* Fixed compact sidebar always visible */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-6">
          {/* Left side of header - now empty where the toggle button was */}
          <div className="flex items-center gap-2">
            {/* Empty space where sidebar toggle was */}
          </div>
          
          {/* Right side of header with user info */}
          <div className="flex items-center gap-4">
            <NotificationsDropdown />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <Link href="/profile" className="flex items-center gap-2">
                {user?.companyLogo && (
                  <img
                    src={user.companyLogo}
                    alt={`${user.companyName || user.username} logo`}
                    className="h-8 w-8 object-contain rounded"
                  />
                )}
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