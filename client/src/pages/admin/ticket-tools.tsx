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
  interface TicketsResponse { 
    tickets: SupportTicket[] 
  }
  
  const { data: ticketsData = { tickets: [] } as TicketsResponse, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ['/api/support-tickets'],
    queryFn: getQueryFn<TicketsResponse>({ on401: 'throw' }),
  });
  
  const tickets = ticketsData.tickets;

  // Get all users
  const { data: usersData = [] as User[], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getQueryFn<User[]>({ on401: 'throw' }),
  });
  const users = usersData;

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

  // Get date 6 months ago for filtering closed tickets
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  
  // Filter tickets for various stats
  const ticketsLastWeek = tickets.filter((ticket: SupportTicket) => {
    const ticketDate = new Date(ticket.createdAt);
    return ticketDate >= lastWeek;
  }).length;

  // Filter closed tickets from last 6 months
  const recentlyClosedTickets = tickets.filter((ticket: SupportTicket) => {
    if (ticket.status.toLowerCase() !== 'closed' || !ticket.closedAt) return false;
    const closedDate = new Date(ticket.closedAt);
    return closedDate >= sixMonthsAgo;
  });
  
  const recentlyClosedCount = recentlyClosedTickets.length;

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
        
        {/* Active Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Support Tickets</CardTitle>
            <CardDescription>
              View and manage open support tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ticketsLoading || usersLoading ? (
              <div className="text-center py-4">Loading tickets...</div>
            ) : tickets.filter(t => t.status.toLowerCase() === 'open').length === 0 ? (
              <div className="text-center py-4">No active support tickets found</div>
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
                      .filter(t => t.status.toLowerCase() === 'open')
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 10) // Only show the 10 most recent open tickets
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
                              <Badge className="bg-yellow-500">
                                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                Open
                              </Badge>
                            </TableCell>
                            <TableCell>{createdDate}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Link href={`/chat/ticket/${ticket.id}`}>
                                  <Button variant="outline" size="sm" className="cursor-pointer">
                                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                    Chat
                                  </Button>
                                </Link>
                                <Link href={`/orders/${ticket.orderId}`}>
                                  <Button variant="ghost" size="sm" className="cursor-pointer">
                                    View Order
                                  </Button>
                                </Link>
                              </div>
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
        
        {/* Recently Closed Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Closed Tickets</CardTitle>
            <CardDescription>
              Tickets closed within the last 6 months (Total: {recentlyClosedCount})
            </CardDescription>
          </CardHeader>
          <CardContent style={{ maxHeight: '37.2vh', overflowY: 'auto' }}>
            {ticketsLoading || usersLoading ? (
              <div className="text-center py-4">Loading tickets...</div>
            ) : recentlyClosedTickets.length === 0 ? (
              <div className="text-center py-4">No recently closed tickets found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Closed Date</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentlyClosedTickets
                      .sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime())
                      .map((ticket: SupportTicket) => {
                        const ticketUser = users.find((u: User) => u.id === ticket.userId);
                        const closedDate = ticket.closedAt ? new Date(ticket.closedAt).toLocaleDateString() : "Unknown";
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
                            <TableCell>{closedDate}</TableCell>
                            <TableCell>
                              {ticket.rating ? (
                                <div className="flex">
                                  {Array(ticket.rating).fill(0).map((_, i) => (
                                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  ))}
                                  {Array(5 - (ticket.rating || 0)).fill(0).map((_, i) => (
                                    <Star key={i} className="h-4 w-4 text-gray-300" />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No rating</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Link href={`/chat/ticket/${ticket.id}`}>
                                  <Button variant="outline" size="sm" className="cursor-pointer">
                                    <History className="h-3.5 w-3.5 mr-1" />
                                    History
                                  </Button>
                                </Link>
                                <Link href={`/orders/${ticket.orderId}`}>
                                  <Button variant="ghost" size="sm" className="cursor-pointer">
                                    View Order
                                  </Button>
                                </Link>
                              </div>
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