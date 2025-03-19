import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Order, OrderComment } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { FileDown, Loader2, ArrowUpDown, MessageSquare } from "lucide-react";

type SortField = "dateOrdered" | "price" | "status";

interface SortConfig {
  field: SortField;
  direction: "asc" | "desc";
}

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "dateOrdered",
    direction: "desc",
  });
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState<string>("");
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders']
  });

  const { data: comments = [] } = useQuery<OrderComment[]>({
    queryKey: ['/api/orders', selectedOrderId, 'comments'],
    enabled: selectedOrderId !== null,
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrderId || !newComment.trim()) return;
      await apiRequest("POST", `/api/orders/${selectedOrderId}/comments`, {
        message: newComment.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', selectedOrderId, 'comments'] });
      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiRequest("PATCH", `/api/orders/${orderId}`, {
        status: "Cancelled",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order cancelled",
        description: "The order has been successfully cancelled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSort = (field: SortField) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredAndSortedOrders = orders
    .filter((order) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        order.sourceUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.targetUrl.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const direction = sortConfig.direction === "asc" ? 1 : -1;

      switch (sortConfig.field) {
        case "dateOrdered":
          return (new Date(a.dateOrdered).getTime() - new Date(b.dateOrdered).getTime()) * direction;
        case "price":
          return (Number(a.price) - Number(b.price)) * direction;
        case "status":
          return a.status.localeCompare(b.status) * direction;
        default:
          return 0;
      }
    });

  const exportToCSV = () => {
    const headers = [
      "Source URL",
      "Target URL",
      "Anchor Text",
      "Price",
      "Status",
      "Date Ordered",
      "Date Completed",
    ].join(",");

    const rows = filteredAndSortedOrders.map((order) => [
      order.sourceUrl,
      order.targetUrl,
      order.anchorText,
      order.price,
      order.status,
      format(new Date(order.dateOrdered), "yyyy-MM-dd"),
      order.dateCompleted
        ? format(new Date(order.dateCompleted), "yyyy-MM-dd")
        : "",
    ].join(","));

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <Button onClick={exportToCSV}>
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="flex gap-4">
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Sent">Sent</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="max-w-[200px]">Source URL</TableHead>
                <TableHead className="max-w-[200px]">Target URL</TableHead>
                <TableHead>Anchor Text</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("price")}>
                    Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("status")}>
                    Status
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("dateOrdered")}>
                    Date Ordered
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="max-w-[200px] truncate">
                    {order.sourceUrl}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {order.targetUrl}
                  </TableCell>
                  <TableCell>{order.anchorText}</TableCell>
                  <TableCell>${Number(order.price).toFixed(2)}</TableCell>
                  <TableCell>{order.status}</TableCell>
                  <TableCell>
                    {format(new Date(order.dateOrdered), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrderId(order.id)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle>Order Comments</SheetTitle>
                            <SheetDescription>
                              View and add comments for this order
                            </SheetDescription>
                          </SheetHeader>
                          <div className="mt-6 space-y-6">
                            <div className="space-y-4">
                              {comments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className="rounded-lg border p-4"
                                >
                                  <p className="text-sm text-muted-foreground">
                                    {format(
                                      new Date(comment.createdAt),
                                      "MMM d, yyyy h:mm a"
                                    )}
                                  </p>
                                  <p className="mt-1">{comment.message}</p>
                                </div>
                              ))}
                            </div>
                            <div className="space-y-4">
                              <Textarea
                                placeholder="Add a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                              />
                              <Button
                                onClick={() => addCommentMutation.mutate()}
                                disabled={!newComment.trim() || addCommentMutation.isPending}
                              >
                                {addCommentMutation.isPending && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Add Comment
                              </Button>
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>

                      {order.status === "Sent" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel this order? This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelOrderMutation.mutate(order.id)}
                              >
                                Confirm
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardShell>
  );
}