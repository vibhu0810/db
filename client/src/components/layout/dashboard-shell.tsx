import { Sidebar } from "./sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";
import { NotificationsDropdown } from "@/components/ui/notifications";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background">
      <div className={`transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-4">
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
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}