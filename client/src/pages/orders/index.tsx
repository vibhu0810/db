import { useState } from "react";
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
import { FileDown, Loader2, MessageSquare, Copy, ChevronDown } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useAuth } from "@/hooks/use-auth";
import { Resizable } from "react-resizable";
import { cn } from "@/lib/utils";

type DateRange = {
  from?: Date;
  to?: Date;
};

export default function Orders() {
  const { isAdmin, user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState<string>("");
  const [sortField, setSortField] = useState<string>("dateOrdered");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: () => {
      const endpoint = isAdmin ? '/api/orders/all' : '/api/orders';
      return apiRequest("GET", endpoint).then(res => res.json());
    },
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

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update order status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Status updated",
        description: "Order status has been updated successfully.",
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard.",
    });
  };

  const filteredOrders = orders
    .filter((order) => {
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
    })
    .sort((a, b) => {
      const aValue = (a as any)[sortField];
      const bValue = (b as any)[sortField];

      if (typeof aValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(field)}
      className="h-8 flex items-center gap-1 hover:bg-transparent"
    >
      {children}
      {sortField === field && (
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform",
          sortDirection === "asc" && "rotate-180"
        )} />
      )}
    </Button>
  );

  const ResizableCell = ({ width, onResize, children }: any) => (
    <Resizable
      width={width}
      height={0}
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <div style={{ width, height: "100%" }}>{children}</div>
    </Resizable>
  );

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
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
            <SelectItem value="Revision">Revision</SelectItem> {/* Added Revision status */}
          </SelectContent>
        </Select>
        <DatePickerWithRange
          date={dateRange}
          setDate={setDateRange}
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {isAdmin && (
                  <TableHead>
                    <SortableHeader field="user.username">User</SortableHeader>
                  </TableHead>
                )}
                <TableHead>
                  <SortableHeader field="sourceUrl">Source URL</SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader field="targetUrl">Target URL</SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader field="anchorText">Anchor Text</SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader field="price">Price</SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader field="status">Status</SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader field="dateOrdered">Date Ordered</SortableHeader>
                </TableHead>
                <TableHead>Text Edit/Article</TableHead>
                {isAdmin && <TableHead>Notes</TableHead>}
                <TableHead>Comments</TableHead>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                {isAdmin && (
                  <TableCell>
                    {order.user?.companyName || order.user?.username}
                  </TableCell>
                )}
                <TableCell className="max-w-[200px]">
                  <div className="flex items-center space-x-2">
                    <span className="truncate">{order.sourceUrl}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(order.sourceUrl)}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="flex items-center space-x-2">
                    <span className="truncate">{order.targetUrl}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(order.targetUrl)}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span>{order.anchorText}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(order.anchorText)}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </TableCell>
                <TableCell>${Number(order.price).toFixed(2)}</TableCell>
                <TableCell>
                  {isAdmin ? (
                    <Select
                      value={order.status}
                      onValueChange={(newStatus) =>
                        updateOrderStatusMutation.mutate({
                          orderId: order.id,
                          status: newStatus,
                        })
                      }
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sent">Sent</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Revision">Revision</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    order.status
                  )}
                </TableCell>
                <TableCell>
                  {format(new Date(order.dateOrdered), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="flex items-center space-x-2">
                    <span className="truncate">{order.textEdit}</span>
                    {order.textEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(order.textEdit || '')}
                        className="shrink-0"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    )}
                  </div>
                </TableCell>
                {isAdmin && <TableCell>{order.notes}</TableCell>}
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
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">
                                    {comment.user?.companyName || comment.user?.username}
                                    {comment.user?.is_admin && " (Admin)"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(comment.createdAt), "MMM d, yyyy h:mm a")}
                                  </p>
                                </div>
                                <p className="mt-2">{comment.message}</p>
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
  );
}