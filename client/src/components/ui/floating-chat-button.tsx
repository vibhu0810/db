import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

export function FloatingChatButton() {
  const { user } = useAuth();
  const [adminOnline, setAdminOnline] = useState(false);

  // Check if admin is online
  const { data: adminStatus } = useQuery({
    queryKey: ["/api/admin-status"],
    queryFn: getQueryFn({
      on401: "returnNull",
    }),
    refetchInterval: 30000, // Check every 30 seconds
  });

  useEffect(() => {
    if (adminStatus) {
      setAdminOnline(adminStatus.online || false);
    }
  }, [adminStatus]);

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Link href="/chat">
        <Button
          size="lg"
          className="rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <span className="hidden sm:inline">Chat with SEO Team</span>
            <div className="relative">
              <Avatar className="h-8 w-8 border-2 border-white">
                <AvatarImage src="/support-avatar.png" alt="Support Team" />
                <AvatarFallback>DG</AvatarFallback>
              </Avatar>
              <Badge 
                className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full p-0 ${
                  adminOnline ? "bg-green-500" : "bg-gray-400"
                }`}
              />
            </div>
          </div>
        </Button>
      </Link>
    </div>
  );
}