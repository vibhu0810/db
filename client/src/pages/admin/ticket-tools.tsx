import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Redirect, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, AlertTriangle, Clock } from "lucide-react";

interface SupportTicket {
  id: number;
  userId: number;
  orderId: number;
  title: string;
  status: string;
  createdAt: string;
  closedAt: string | null;
  rating: number | null;
  feedback: string | null;
}

interface User {
  id: number;
  username: string;
  companyName?: string;
  email: string;
}

export default function AdminTicketTools() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [isClosingAll, setIsClosingAll] = useState(false);
  
  // Redirect non-admin users
  if (!isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  // Get all tickets
  const { data: ticketsData = { tickets: [] }, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ['/api/support-tickets'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });
  const tickets = ticketsData.tickets as SupportTicket[];

  // Get all users
  const { data: usersData = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });
  const users = usersData as User[];

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
      
      // Refresh ticket data
      refetchTickets();
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

  // Count total tickets and open tickets
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((ticket: SupportTicket) => ticket.status.toLowerCase() === 'open').length;
  
  // Get stats on most recent tickets
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  
  const ticketsLastWeek = tickets.filter((ticket: SupportTicket) => {
    const ticketDate = new Date(ticket.createdAt);
    return ticketDate >= lastWeek;
  }).length;

  return (
    <DashboardShell>
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Admin Tools</h2>
      </div>
      
      <div className="grid gap-6">
        {/* Ticket stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <Badge variant="outline" className="px-3 py-1">Total</Badge>
                <p className="text-3xl font-bold">{totalTickets}</p>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <Badge className="px-3 py-1 bg-yellow-500">{openTickets}</Badge>
                <p className="text-3xl font-bold">{openTickets}</p>
                <p className="text-sm text-muted-foreground">Open Tickets</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <Badge variant="secondary" className="px-3 py-1">{ticketsLastWeek}</Badge>
                <p className="text-3xl font-bold">{ticketsLastWeek}</p>
                <p className="text-sm text-muted-foreground">New This Week</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <Badge variant="outline" className="px-3 py-1 bg-green-500 text-white">
                  {Math.round(((totalTickets - openTickets) / totalTickets) * 100) || 0}%
                </Badge>
                <p className="text-3xl font-bold">
                  {Math.round(((totalTickets - openTickets) / totalTickets) * 100) || 0}%
                </p>
                <p className="text-sm text-muted-foreground">Resolution Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Ticket Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Support Ticket Management</CardTitle>
            <CardDescription>
              Manage all support tickets in the system with bulk operations
            </CardDescription>
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
                  disabled={isClosingAll || openTickets === 0}
                >
                  {isClosingAll ? "Closing Tickets..." : `Close All Open Tickets (${openTickets})`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Ticket Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Support Tickets</CardTitle>
            <CardDescription>
              View and manage all support tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ticketsLoading || usersLoading ? (
              <div className="text-center py-4">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-4">No support tickets found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets
                      .sort((a: SupportTicket, b: SupportTicket) => {
                        // Sort by status first (open tickets first)
                        if (a.status.toLowerCase() === 'open' && b.status.toLowerCase() !== 'open') {
                          return -1;
                        }
                        if (a.status.toLowerCase() !== 'open' && b.status.toLowerCase() === 'open') {
                          return 1;
                        }
                        // Then sort by creation date (newest first)
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      })
                      .slice(0, 10) // Only show the 10 most recent/important tickets
                      .map((ticket: SupportTicket) => {
                        const ticketUser = users.find((u: User) => u.id === ticket.userId);
                        const createdDate = new Date(ticket.createdAt).toLocaleDateString();
                        return (
                          <TableRow key={ticket.id}>
                            <TableCell>{ticket.id}</TableCell>
                            <TableCell>
                              <Link href={`/orders/${ticket.orderId}`} className="text-primary hover:underline">
                                #{ticket.orderId}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {ticketUser ? (
                                <span title={ticketUser.email}>
                                  {ticketUser.companyName || ticketUser.username}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Unknown User</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate" title={ticket.title}>
                              {ticket.title}
                            </TableCell>
                            <TableCell>
                              {ticket.status.toLowerCase() === 'open' ? (
                                <Badge className="bg-yellow-500">
                                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                  Open
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  Closed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{createdDate}</TableCell>
                            <TableCell>
                              <Link href={`/orders/${ticket.orderId}`}>
                                <Button variant="ghost" size="sm" className="cursor-pointer">
                                  View Order
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}