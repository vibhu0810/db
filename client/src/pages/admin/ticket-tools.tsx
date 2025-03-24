import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Redirect } from "wouter";

export default function AdminTicketTools() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [isClosingAll, setIsClosingAll] = useState(false);
  
  // Redirect non-admin users
  if (!isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  const handleCloseAllTickets = async () => {
    if (isClosingAll) return;
    
    try {
      setIsClosingAll(true);
      const response = await apiRequest("POST", "/api/support-tickets/close-all");
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to close tickets");
      }
      
      const result = await response.json();
      
      toast({
        title: "Success",
        description: result.message || "All tickets have been closed",
      });
    } catch (error: any) {
      console.error("Error closing tickets:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to close all tickets",
        variant: "destructive",
      });
    } finally {
      setIsClosingAll(false);
    }
  };

  return (
    <DashboardShell>
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Admin Tools</h2>
      </div>
      
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Support Ticket Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Close All Support Tickets</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This action will close all currently open support tickets in the system. 
                  This operation cannot be undone.
                </p>
                <Button 
                  variant="destructive" 
                  onClick={handleCloseAllTickets}
                  disabled={isClosingAll}
                >
                  {isClosingAll ? "Closing Tickets..." : "Close All Open Tickets"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}