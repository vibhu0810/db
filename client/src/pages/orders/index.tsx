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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { FileDown, Loader2, ArrowUpDown, MessageSquare } from "lucide-react";
import { Resizable } from "react-resizable";
import "react-resizable/css/styles.css";
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
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "dateOrdered",
    direction: "desc",
  });
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState<string>("");
  const [sourceUrlWidth, setSourceUrlWidth] = useState(300);
  const [targetUrlWidth, setTargetUrlWidth] = useState(300);
  const [anchorTextWidth, setAnchorTextWidth] = useState(200);
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders']
  });

  const { data: comments = [], isLoading: isLoadingComments } = useQuery<OrderComment[]>({
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

  const handleSort = (field: SortField) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleResize = (column: string, { size }: { size: { width: number } }) => {
    const width = Math.max(200, Math.min(600, size.width));
    switch (column) {
      case 'sourceUrl':
        setSourceUrlWidth(width);
        break;
      case 'targetUrl':
        setTargetUrlWidth(width);
        break;
      case 'anchorText':
        setAnchorTextWidth(width);
        break;
    }
  };

  const filteredAndSortedOrders = orders
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
    ].join(",");

    const rows = filteredAndSortedOrders.map((order) => [
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

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="relative">
                  <Resizable
                    width={sourceUrlWidth}
                    height={40}
                    onResize={(e, data) => handleResize('sourceUrl', data)}
                    handle={<div className="react-resizable-handle" />}
                  >
                    <div style={{ width: sourceUrlWidth }} className="pr-4">Source URL</div>
                  </Resizable>
                </TableHead>
                <TableHead className="relative">
                  <Resizable
                    width={targetUrlWidth}
                    height={40}
                    onResize={(e, data) => handleResize('targetUrl', data)}
                    handle={<div className="react-resizable-handle" />}
                  >
                    <div style={{ width: targetUrlWidth }} className="pr-4">Target URL</div>
                  </Resizable>
                </TableHead>
                <TableHead className="relative">
                  <Resizable
                    width={anchorTextWidth}
                    height={40}
                    onResize={(e, data) => handleResize('anchorText', data)}
                    handle={<div className="react-resizable-handle" />}
                  >
                    <div style={{ width: anchorTextWidth }} className="pr-4">Anchor Text</div>
                  </Resizable>
                </TableHead>
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
                <TableHead>Comments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell style={{ width: sourceUrlWidth, maxWidth: sourceUrlWidth }} className="truncate">
                    {order.sourceUrl}
                  </TableCell>
                  <TableCell style={{ width: targetUrlWidth, maxWidth: targetUrlWidth }} className="truncate">
                    {order.targetUrl}
                  </TableCell>
                  <TableCell style={{ width: anchorTextWidth, maxWidth: anchorTextWidth }} className="truncate">
                    {order.anchorText}
                  </TableCell>
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
                                    {(() => {
                                      try {
                                        if (!comment.createdAt) return 'Just now';
                                        const date = parseISO(comment.createdAt);
                                        return format(date, "MMM d, yyyy h:mm a");
                                      } catch (error) {
                                        console.error('Date parsing error:', error);
                                        return 'Just now';
                                      }
                                    })()}
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