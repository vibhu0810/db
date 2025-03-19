import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { FileDown, Loader2, ArrowUpDown, MessageSquare, Copy } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

type SortField = "dateOrdered" | "price" | "status";

interface SortConfig {
  field: SortField;
  direction: "asc" | "desc";
}

interface DateRange {
  from?: Date;
  to?: Date;
}

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState<string>("");
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: () => apiRequest("GET", "/api/orders").then(res => res.json()),
  });

  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['/api/orders', selectedOrderId, 'comments'],
    queryFn: () => apiRequest("GET", `/api/orders/${selectedOrderId}/comments`).then(res => res.json()),
    enabled: selectedOrderId !== null,
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrderId || !newComment.trim()) {
        throw new Error("Please enter a comment");
      }
      const res = await apiRequest("POST", `/api/orders/${selectedOrderId}/comments`, {
        orderId: selectedOrderId,
        message: newComment.trim(),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add comment");
      }
      return res.json();
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

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </DashboardShell>
    );
  }

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      order.sourceUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.targetUrl.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDateRange = !dateRange.from || !dateRange.to || (
      new Date(order.dateOrdered) >= dateRange.from &&
      new Date(order.dateOrdered) <= dateRange.to
    );

    return matchesStatus && matchesSearch && matchesDateRange;
  });

  const exportToCSV = () => {
    const headers = [
      "Source URL",
      "Target URL",
      "Anchor Text",
      "Price",
      "Status",
      "Date Ordered",
    ].join(",");

    const rows = filteredOrders.map((order) => [
      order.sourceUrl,
      order.targetUrl,
      order.anchorText,
      order.price,
      order.status,
      format(new Date(order.dateOrdered), "yyyy-MM-dd"),
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

        <div className="flex flex-wrap gap-4">
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
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <DatePickerWithRange
            date={dateRange}
            setDate={setDateRange}
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source URL</TableHead>
                <TableHead>Target URL</TableHead>
                <TableHead>Anchor Text</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Ordered</TableHead>
                <TableHead>Comments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.sourceUrl}</TableCell>
                  <TableCell>{order.targetUrl}</TableCell>
                  <TableCell>{order.anchorText}</TableCell>
                  <TableCell>${Number(order.price).toFixed(2)}</TableCell>
                  <TableCell>{order.status}</TableCell>
                  <TableCell>
                    {format(new Date(order.dateOrdered), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
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
                            {isLoadingComments ? (
                              <div className="flex justify-center">
                                <Loader2 className="h-6 w-6 animate-spin" />
                              </div>
                            ) : comments.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No comments yet</p>
                            ) : (
                              comments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className="rounded-lg border p-4"
                                >
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(comment.createdAt), "MMM d, yyyy h:mm a")}
                                  </p>
                                  <p className="mt-1">{comment.message}</p>
                                </div>
                              ))
                            )}
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
                              className="w-full"
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