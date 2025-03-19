import React, { useState } from "react";
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
import 'react-resizable/css/styles.css';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  const [columnWidths, setColumnWidths] = useState({
    sourceUrl: 200,
    targetUrl: 200,
    anchorText: 150,
    textEdit: 200,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const onResize = (column: string) => (e: any, { size }: { size: { width: number } }) => {
    setColumnWidths(prev => ({
      ...prev,
      [column]: size.width,
    }));
  };

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

  // Calculate pagination
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select
            value={String(itemsPerPage)}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1); // Reset to first page when changing items per page
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">per page</span>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} entries
        </div>
      </div>


      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-[150px]">
                  <SortableHeader field="user.username">User</SortableHeader>
                </TableHead>
              )}
              <TableHead>
                <Resizable
                  width={columnWidths.sourceUrl}
                  height={0}
                  onResize={onResize("sourceUrl")}
                  handle={<div className="react-resizable-handle" />}
                >
                  <div style={{ width: columnWidths.sourceUrl }}>
                    <SortableHeader field="sourceUrl">Source URL</SortableHeader>
                  </div>
                </Resizable>
              </TableHead>
              <TableHead>
                <Resizable
                  width={columnWidths.targetUrl}
                  height={0}
                  onResize={onResize("targetUrl")}
                  handle={<div className="react-resizable-handle" />}
                >
                  <div style={{ width: columnWidths.targetUrl }}>
                    <SortableHeader field="targetUrl">Target URL</SortableHeader>
                  </div>
                </Resizable>
              </TableHead>
              <TableHead>
                <Resizable
                  width={columnWidths.anchorText}
                  height={0}
                  onResize={onResize("anchorText")}
                  handle={<div className="react-resizable-handle" />}
                >
                  <div style={{ width: columnWidths.anchorText }}>
                    <SortableHeader field="anchorText">Anchor Text</SortableHeader>
                  </div>
                </Resizable>
              </TableHead>
              <TableHead className="w-[100px]">
                <SortableHeader field="price">Price</SortableHeader>
              </TableHead>
              <TableHead className="w-[120px]">
                <SortableHeader field="status">Status</SortableHeader>
              </TableHead>
              <TableHead className="w-[120px]">
                <SortableHeader field="dateOrdered">Date Ordered</SortableHeader>
              </TableHead>
              <TableHead>
                <Resizable
                  width={columnWidths.textEdit}
                  height={0}
                  onResize={onResize("textEdit")}
                  handle={<div className="react-resizable-handle" />}
                >
                  <div style={{ width: columnWidths.textEdit }}>
                    Text Edit/Article
                  </div>
                </Resizable>
              </TableHead>
              {isAdmin && <TableHead className="w-[200px]">Notes</TableHead>}
              <TableHead className="w-[80px]">Comments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.map((order) => (
              <TableRow key={order.id}>
                {isAdmin && (
                  <TableCell className="max-w-[150px] truncate">
                    {order.user?.companyName || order.user?.username}
                  </TableCell>
                )}
                <TableCell style={{ width: columnWidths.sourceUrl }}>
                  <div className="flex items-center space-x-2">
                    <span className="truncate">{order.sourceUrl}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(order.sourceUrl)}
                      className="h-8 w-8 shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell style={{ width: columnWidths.targetUrl }}>
                  <div className="flex items-center space-x-2">
                    <span className="truncate">{order.targetUrl}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(order.targetUrl)}
                      className="h-8 w-8 shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell style={{ width: columnWidths.anchorText }}>
                  <div className="flex items-center space-x-2">
                    <span className="truncate">{order.anchorText}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(order.anchorText)}
                      className="h-8 w-8 shrink-0"
                    >
                      <Copy className="h-4 w-4" />
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
                <TableCell style={{ width: columnWidths.textEdit }}>
                  <div className="flex items-center space-x-2">
                    <span className="truncate">{order.textEdit}</span>
                    {order.textEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(order.textEdit || '')}
                        className="h-8 w-8 shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                {isAdmin && <TableCell className="max-w-[200px] truncate">{order.notes}</TableCell>}
                <TableCell>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
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

      <div className="flex items-center justify-center mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              />
            </PaginationItem>

            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              // Show first page, last page, current page and pages around current
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 2 && page <= currentPage + 2)
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              } else if (
                page === currentPage - 3 ||
                page === currentPage + 3
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              return null;
            })}

            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}