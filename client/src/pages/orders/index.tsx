import React, { useState, useEffect } from "react";
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
import { StatusBadge } from "@/components/ui/status-badge";
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
import { FileDown, Loader2, MessageSquare, Copy, ChevronDown, X } from "lucide-react";
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
import { MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { User, GUEST_POST_STATUSES, NICHE_EDIT_STATUSES } from "@shared/schema";
import { Plus } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Checkbox from "@/components/ui/checkbox";
import { Link } from "wouter";

// Helper function to extract domain from URL
function extractDomainFromUrl(url: string): string {
  if (!url || url === "not_applicable") return "";
  try {
    // Use URL constructor to parse the URL
    const urlObj = new URL(url);
    // Remove 'www.' prefix if present
    let domain = urlObj.hostname;
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    return domain;
  } catch (e) {
    // If URL is invalid, return the original string
    return url;
  }
}

// Make sure our DateRange is compatible with react-day-picker's DateRange
import { DateRange as DayPickerDateRange } from "react-day-picker";

interface DateRange {
  from?: Date;
  to?: Date;
}

interface EditOrderFormData {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  textEdit: string;
  notes: string;
  price: number;
}

// Interface for orders with unread comments count
interface Order {
  id: number;
  userId: number;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  textEdit: string | null;
  notes: string | null;
  price: string;
  status: string;
  dateOrdered: string;
  dateCompleted: string | null;
  title: string | null;
  linkUrl: string | null;
  unreadComments?: number;  // Added for unread comment counts
}

interface CustomOrderFormData {
  userId: number;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  textEdit: string;
  notes: string;
  price: number;
}

const customOrderSchema = z.object({
  userId: z.number().min(1, "Please select a user"),
  sourceUrl: z.string().min(1, "Source URL is required").url("Must be a valid URL"),
  targetUrl: z.string().min(1, "Target URL is required").url("Must be a valid URL"),
  anchorText: z.string().min(1, "Anchor text is required"),
  textEdit: z.string().optional(),
  notes: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
});

function EditOrderSheet({
  order,
  isOpen,
  onOpenChange
}: {
  order: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const form = useForm<EditOrderFormData>({
    defaultValues: {
      sourceUrl: order.sourceUrl,
      targetUrl: order.targetUrl,
      anchorText: order.anchorText,
      textEdit: order.textEdit || "",
      notes: order.notes || "",
      price: order.price,
    },
  });

  const editOrderMutation = useMutation({
    mutationFn: async (data: EditOrderFormData) => {
      const res = await apiRequest("PATCH", `/api/orders/${order.id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order updated",
        description: "Order has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditOrderFormData) => {
    editOrderMutation.mutate(data);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Edit Order #{order.id}</SheetTitle>
          <SheetDescription>
            Make changes to the order details below.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="sourceUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source URL/Guest Post Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target URL</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="anchorText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anchor Text</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="textEdit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text Edit/Article</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={editOrderMutation.isPending}
            >
              {editOrderMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

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
    sourceUrl: 250,
    targetUrl: 250,
    anchorText: 180,
    textEdit: 250,
    notes: 200,
    status: 180,
    id: 100,
    price: 100,
    date: 120,
    actions: 150,
    user: 150,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [highlightedOrderId, setHighlightedOrderId] = useState<number | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<any>(null);
  const [userFilter, setUserFilter] = useState<number | "all">("all");
  const [showCustomOrderSheet, setShowCustomOrderSheet] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [previousOrderStatuses, setPreviousOrderStatuses] = useState<Record<number, string>>({});
  // Track manual status updates with timestamps to know which ones were user-initiated
  const [recentStatusUpdates, setRecentStatusUpdates] = useState<Record<number, number>>({});
  const [isActionInProgress, setIsActionInProgress] = useState<boolean>(false);

  const onResize = (column: string) => (e: any, { size }: { size: { width: number } }) => {
    const maxWidths = {
      sourceUrl: 400,
      targetUrl: 400,
      anchorText: 300,
      textEdit: 400,
      notes: 350,
      status: 300,
      id: 150,
      price: 150,
      date: 180,
      actions: 200,
      user: 200,
    };

    const minWidth = 50; // Add a minimum width
    const maxWidth = maxWidths[column as keyof typeof maxWidths];
    const newWidth = Math.min(Math.max(size.width, minWidth), maxWidth);
    
    console.log(`Resizing column ${column} to ${newWidth}px`);

    setColumnWidths(prev => ({
      ...prev,
      [column]: newWidth,
    }));
  };
  
  // Apply CSS for resizable columns
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      table {
        width: 100%;
        table-layout: fixed;
      }
      
      th {
        position: relative;
        overflow: visible;
      }
      
      .react-resizable {
        position: relative;
      }
      
      .react-resizable-handle {
        position: absolute;
        right: -1px;
        bottom: 0;
        top: 0;
        width: 8px;
        height: 100%;
        cursor: col-resize;
        z-index: 1;
        background-color: transparent;
      }
      
      .react-resizable-handle:after {
        content: "";
        position: absolute;
        right: 3px;
        top: 0;
        height: 100%;
        width: 2px;
        background-color: #e2e8f0;
      }
      
      .react-resizable-handle:hover:after,
      .react-resizable-handle:active:after {
        background-color: #3b82f6;
      }
      
      .truncate-cell {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Track unread comments
  const [unreadCommentCounts, setUnreadCommentCounts] = useState<{[key: number]: number}>({});

  // Mutation for marking comments as read
  const markCommentsAsReadMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/comments/read`);
      if (!response.ok) {
        throw new Error("Failed to mark comments as read");
      }
      return response.json();
    },
    onSuccess: (_, orderId) => {
      // Update the local state immediately to remove the badge
      const updatedCounts = {...unreadCommentCounts};
      delete updatedCounts[orderId];
      setUnreadCommentCounts(updatedCounts);
      
      // Also invalidate related queries to update the server data
      queryClient.invalidateQueries({ queryKey: ['/api/orders/unread-comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark comments as read",
        variant: "destructive",
      });
      console.error("Failed to mark comments as read:", error);
    }
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: () => {
      const endpoint = isAdmin ? '/api/orders/all' : '/api/orders';
      return apiRequest("GET", endpoint).then(res => res.json());
    },
    refetchInterval: 10000, // Refetch orders every 10 seconds
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest("GET", "/api/users").then(res => res.json()),
    enabled: isAdmin,
  });

  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['/api/orders', selectedOrderId, 'comments'],
    queryFn: () => apiRequest("GET", `/api/orders/${selectedOrderId}/comments`).then(res => res.json()),
    enabled: selectedOrderId !== null,
    refetchInterval: selectedOrderId ? 3000 : false, // Poll every 3 seconds when a comment modal is open
  });
  
  // Query for unread comment counts across all orders
  useQuery({
    queryKey: ['/api/orders/unread-comments'],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/orders/unread-comments");
        const data = await response.json();
        
        if (response.ok) {
          setUnreadCommentCounts(data);
        }
        return data;
      } catch (error) {
        console.error("Failed to fetch unread comments:", error);
        return {};
      }
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      setIsActionInProgress(true);
      if (!selectedOrderId || !newComment.trim()) {
        throw new Error("Please enter a comment");
      }
      
      const commentData = {
        orderId: selectedOrderId,
        message: newComment.trim(),
      };
      
      const res = await apiRequest("POST", `/api/orders/${selectedOrderId}/comments`, commentData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add comment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', selectedOrderId, 'comments'] });
      
      // Reset state safely
      setTimeout(() => {
        setNewComment("");
        setIsActionInProgress(false);
        
        toast({
          title: "Comment added",
          description: "Your comment has been added successfully.",
        });
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsActionInProgress(false);
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      setIsActionInProgress(true);
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update order status");
      }
      return { orderId, data: await res.json() };
    },
    onSuccess: (result) => {
      const { orderId } = result;
      // Mark this order as recently updated with timestamp to prevent duplicate toast in the useEffect
      const timestamp = Date.now();
      setRecentStatusUpdates(prev => {
        const newUpdates = { ...prev };
        newUpdates[orderId] = timestamp;
        return newUpdates;
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Status updated",
        description: "Order status has been updated successfully.",
      });
      
      // Reset action flag after a brief delay to prevent UI glitches
      setTimeout(() => {
        setIsActionInProgress(false);
      }, 300);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsActionInProgress(false);
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      setIsActionInProgress(true);
      const res = await apiRequest("DELETE", `/api/orders/${orderId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete order");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order deleted",
        description: "The order has been deleted successfully.",
      });
      
      // Reset all states in a consistent manner
      setTimeout(() => {
        setOrderToDelete(null);
        setOrderToEdit(null);
        setOrderToCancel(null);
        setSelectedOrderId(null);
        setIsActionInProgress(false);
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      // Make sure to reset the state even on error
      setOrderToDelete(null);
      setIsActionInProgress(false);
    },
  });

  const createCustomOrderMutation = useMutation({
    mutationFn: async (data: CustomOrderFormData) => {
      setIsActionInProgress(true);
      const res = await apiRequest("POST", "/api/orders", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order created",
        description: "Order has been created successfully.",
      });
      
      // Reset states in a consistent manner
      setTimeout(() => {
        setShowCustomOrderSheet(false);
        setIsActionInProgress(false);
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsActionInProgress(false);
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      setIsActionInProgress(true);
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status: "Cancelled" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to cancel order");
      }
      return orderId;
    },
    onSuccess: (orderId) => {
      // Mark this order as recently updated with timestamp to prevent duplicate toast
      const timestamp = Date.now();
      setRecentStatusUpdates(prev => {
        const newUpdates = { ...prev };
        newUpdates[orderId] = timestamp;
        return newUpdates;
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order cancelled",
        description: "The order has been cancelled successfully.",
      });
      
      // Reset all states in a consistent manner with a slightly longer delay for better UX
      setTimeout(() => {
        setOrderToCancel(null);
        setOrderToEdit(null);
        setOrderToDelete(null);
        setSelectedOrderId(null);
        setIsActionInProgress(false);
      }, 300);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      // Make sure to reset the state even on error
      setOrderToCancel(null);
      setIsActionInProgress(false);
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
    .filter((order: any) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        order.sourceUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.targetUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toString().includes(searchQuery);

      const matchesDateRange = !dateRange.from || !dateRange.to || (
        new Date(order.dateOrdered) >= dateRange.from &&
        new Date(order.dateOrdered) <= dateRange.to
      );

      const matchesUser = !isAdmin || userFilter === "all" || order.userId === userFilter;

      return matchesStatus && matchesSearch && matchesDateRange && matchesUser;
    })
    .sort((a: any, b: any) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(field)}
      className="h-8 flex items-center gap-1 hover:bg-transparent px-0"
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
      "Order ID",
      "Source URL/Guest Post Title",
      "Target URL",
      "Anchor Text",
      "Price",
      "Status",
      "Date Ordered",
    ].join(",");

    const rows = filteredOrders.map((order: any) => [
      order.id,
      order.title && order.title !== "not_applicable" 
        ? (order.sourceUrl !== "not_applicable" 
            ? `${order.title} (${order.sourceUrl})`
            : order.title)
        : order.sourceUrl === "not_applicable"
          ? "No title provided"
          : order.sourceUrl,
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

  const form = useForm<CustomOrderFormData>({
    resolver: zodResolver(customOrderSchema),
    defaultValues: {
      userId: 0,
      sourceUrl: "",
      targetUrl: "",
      anchorText: "",
      textEdit: "",
      notes: "",
      price: 0,
    },
  });

  const onSubmit = (data: CustomOrderFormData) => {
    const orderData = {
      ...data,
      dateOrdered: new Date().toISOString(),
      price: Number(data.price) || 0,
      userId: Number(data.userId) || 0,
    };
    createCustomOrderMutation.mutate(orderData);
  };

  // Render status badge based on status value
  const renderStatusBadge = (status: string) => {
    return <StatusBadge status={status} />;
  };

  // Use the same status options for both guest posts and niche edits
  const getStatusOptions = () => {
    return (
      <>
        <SelectItem value="In Progress">In Progress</SelectItem>
        <SelectItem value="Approved">Approved</SelectItem>
        <SelectItem value="Sent to Editor">Sent to Editor</SelectItem>
        <SelectItem value="Completed">Completed</SelectItem>
        <SelectItem value="Rejected">Rejected</SelectItem>
        <SelectItem value="Cancelled">Cancelled</SelectItem>
      </>
    );
  };

  // Check for status changes to show toast notifications
  // This only runs when orders are fetched from polling (not user-triggered updates)
  useEffect(() => {
    if (!isLoading && orders.length > 0 && !isActionInProgress) {
      // Create a map of current order statuses
      const currentOrderStatuses: Record<number, string> = {};
      const now = Date.now();
      const TIME_THRESHOLD = 10000; // 10 seconds threshold for ignoring recent manual updates
      
      orders.forEach((order: any) => {
        currentOrderStatuses[order.id] = order.status;
        
        // If we have a previous status and it's different than the current one
        if (
          previousOrderStatuses[order.id] && 
          previousOrderStatuses[order.id] !== order.status
        ) {
          // Check if this was a recent manual update (within threshold)
          const lastUpdateTime = recentStatusUpdates[order.id] || 0;
          const isRecentManualUpdate = (now - lastUpdateTime) < TIME_THRESHOLD;
          
          // Only show toast if it wasn't a recent manual update
          if (!isRecentManualUpdate) {
            toast({
              title: `Order #${order.id} status updated`,
              description: `Status changed from ${previousOrderStatuses[order.id]} to ${order.status}`,
              variant: "default",
            });
          }
        }
      });
      
      // Update the previous statuses map for the next comparison
      setPreviousOrderStatuses(currentOrderStatuses);
      
      // Clean up old timestamp entries that are beyond the threshold
      if (Object.keys(recentStatusUpdates).length > 0) {
        const cleanedUpdates: Record<number, number> = {};
        
        // Keep only the recent entries within threshold
        Object.entries(recentStatusUpdates).forEach(([orderId, timestamp]) => {
          const numericOrderId = parseInt(orderId);
          if ((now - (timestamp as number)) < TIME_THRESHOLD) {
            cleanedUpdates[numericOrderId] = timestamp as number;
          }
        });
        
        // Only update if there's a change in the tracked updates
        if (Object.keys(cleanedUpdates).length !== Object.keys(recentStatusUpdates).length) {
          setRecentStatusUpdates(cleanedUpdates);
        }
      }
    }
  }, [isLoading, orders, toast, recentStatusUpdates, isActionInProgress, previousOrderStatuses]);

  useEffect(() => {
    if (!isLoading && orders.length > 0) {
      const notificationDataStr = sessionStorage.getItem('notificationData');
      if (notificationDataStr) {
        try {
          const notificationData = JSON.parse(notificationDataStr);
          const { orderId, type } = notificationData;

          setHighlightedOrderId(orderId);

          const orderIndex = filteredOrders.findIndex((order: any) => order.id === orderId);
          if (orderIndex !== -1) {
            const pageNumber = Math.floor(orderIndex / itemsPerPage) + 1;
            setCurrentPage(pageNumber);

            if (type === 'comment') {
              setSelectedOrderId(orderId);
            }

            sessionStorage.removeItem('notificationData');

            setTimeout(() => {
              const element = document.getElementById(`order-${orderId}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 500);
          }
        } catch (error) {
          console.error('Error processing notification data:', error);
        }
      }
    }
  }, [isLoading, orders, filteredOrders, itemsPerPage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">
            Manage and track your orders
          </p>
        </div>
        {/* Company logo removed as requested */}
        <div className="flex gap-2">
          {isAdmin && (
            <Sheet open={showCustomOrderSheet} onOpenChange={setShowCustomOrderSheet}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Custom Order
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Create Custom Order</SheetTitle>
                  <SheetDescription>
                    Create a new order for any user
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select User</FormLabel>
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(value) => field.onChange(Number(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a user" />
                              </SelectTrigger>
                              <SelectContent>
                                {users.map((user) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.companyName || user.username}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sourceUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Source URL/Guest Post Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="targetUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target URL</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="anchorText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Anchor Text</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="textEdit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Text Edit/Article</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createCustomOrderMutation.isPending}
                      >
                        {createCustomOrderMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Order
                      </Button>
                    </form>
                  </Form>
                </div>
              </SheetContent>
            </Sheet>
          )}
          <Button onClick={exportToCSV}>
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search by Order ID, Source URL, or Target URL..."
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
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Sent to Editor">Sent to Editor</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select
            value={String(userFilter)}
            onValueChange={(value) => setUserFilter(value === "all" ? "all" : Number(value))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={String(user.id)}>
                  {user.companyName || user.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DatePickerWithRange
          date={dateRange as DayPickerDateRange}
          setDate={(date) => setDateRange(date || {})}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select
            value={String(itemsPerPage)}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
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


      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead style={{ width: columnWidths.user || 150 }}>
                        <Resizable
                          width={columnWidths.user || 150}
                          height={38}
                          onResize={onResize('user')}
                          resizeHandles={['e']}
                          handle={
                            <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                          }
                        >
                          <div className="h-full flex items-center pr-4">
                            <SortableHeader field="user.username">User</SortableHeader>
                          </div>
                        </Resizable>
                      </TableHead>
                    )}
                    <TableHead style={{ width: columnWidths.id }}>
                      <Resizable
                        width={columnWidths.id}
                        height={38}
                        onResize={onResize('id')}
                        resizeHandles={['e']}
                        handle={
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                        }
                      >
                        <div className="h-full flex items-center pr-4">
                          <SortableHeader field="id">Order ID</SortableHeader>
                        </div>
                      </Resizable>
                    </TableHead>
                    <TableHead style={{ width: columnWidths.sourceUrl }}>
                      <Resizable
                        width={columnWidths.sourceUrl}
                        height={38}
                        onResize={onResize('sourceUrl')}
                        resizeHandles={['e']}
                        handle={
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                        }
                      >
                        <div className="h-full flex items-center pr-4">
                          <SortableHeader field="sourceUrl">Source URL/Guest Post Title</SortableHeader>
                        </div>
                      </Resizable>
                    </TableHead>
                    <TableHead style={{ width: columnWidths.targetUrl }}>
                      <Resizable
                        width={columnWidths.targetUrl}
                        height={38}
                        onResize={onResize('targetUrl')}
                        resizeHandles={['e']}
                        handle={
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                        }
                      >
                        <div className="h-full flex items-center pr-4">
                          <SortableHeader field="targetUrl">Target URL</SortableHeader>
                        </div>
                      </Resizable>
                    </TableHead>
                    <TableHead style={{ width: columnWidths.anchorText }}>
                      <Resizable
                        width={columnWidths.anchorText}
                        height={38}
                        onResize={onResize('anchorText')}
                        resizeHandles={['e']}
                        handle={
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                        }
                      >
                        <div className="h-full flex items-center pr-4">
                          <SortableHeader field="anchorText">Anchor Text</SortableHeader>
                        </div>
                      </Resizable>
                    </TableHead>
                    <TableHead style={{ width: columnWidths.price || 100 }} className="text-right">
                      <Resizable
                        width={columnWidths.price || 100}
                        height={38}
                        onResize={onResize('price')}
                        resizeHandles={['e']}
                        handle={
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                        }
                      >
                        <div className="h-full flex items-center justify-end pr-4">
                          <SortableHeader field="price">Price</SortableHeader>
                        </div>
                      </Resizable>
                    </TableHead>
                    <TableHead style={{ width: columnWidths.status || 180 }}>
                      <Resizable
                        width={columnWidths.status || 180}
                        height={38}
                        onResize={onResize('status')}
                        resizeHandles={['e']}
                        handle={
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                        }
                      >
                        <div className="h-full flex items-center pr-4">
                          <SortableHeader field="status">Status</SortableHeader>
                        </div>
                      </Resizable>
                    </TableHead>
                    <TableHead style={{ width: columnWidths.date || 120 }}>
                      <Resizable
                        width={columnWidths.date || 120}
                        height={38}
                        onResize={onResize('date')}
                        resizeHandles={['e']}
                        handle={
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                        }
                      >
                        <div className="h-full flex items-center pr-4">
                          <SortableHeader field="dateOrdered">Date</SortableHeader>
                        </div>
                      </Resizable>
                    </TableHead>
                    <TableHead style={{ width: columnWidths.textEdit || 250 }}>
                      <Resizable
                        width={columnWidths.textEdit || 250}
                        height={38}
                        onResize={onResize('textEdit')}
                        resizeHandles={['e']}
                        handle={
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                        }
                      >
                        <div className="h-full flex items-center pr-4">
                          Text Edit/Article
                        </div>
                      </Resizable>
                    </TableHead>
                    <TableHead style={{ width: columnWidths.notes || 200 }}>
                      <Resizable
                        width={columnWidths.notes || 200}
                        height={38}
                        onResize={onResize('notes')}
                        resizeHandles={['e']}
                        handle={
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                        }
                      >
                        <div className="h-full flex items-center pr-4">
                          Notes
                        </div>
                      </Resizable>
                    </TableHead>
                    <TableHead style={{ width: columnWidths.actions || 150 }}>
                      <Resizable
                        width={columnWidths.actions || 150}
                        height={38}
                        onResize={onResize('actions')}
                        resizeHandles={['e']}
                        handle={
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                        }
                      >
                        <div className="h-full"></div>
                      </Resizable>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order: any) => (
                    <TableRow
                      key={order.id}
                      id={`order-${order.id}`}
                      className={cn(
                        highlightedOrderId === order.id && "bg-muted transition-colors duration-500"
                      )}
                    >
                      {isAdmin && (
                        <TableCell className="max-w-[150px]">
                          <div className="truncate">{order.user?.companyName || order.user?.username}</div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Link 
                          href={`/orders/${order.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          #{order.id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="truncate max-w-[250px]">
                            {order.title && order.title !== "not_applicable" 
                              ? (order.sourceUrl !== "not_applicable" 
                                  ? `${order.title} (${order.sourceUrl})`
                                  : order.title)
                              : order.sourceUrl === "not_applicable" 
                                ? "No title provided" 
                                : order.sourceUrl}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0"
                            onClick={() => copyToClipboard(order.title && order.title !== "not_applicable" 
                              ? (order.sourceUrl !== "not_applicable" 
                                  ? `${order.title} (${order.sourceUrl})`
                                  : order.title)
                              : order.sourceUrl === "not_applicable"
                                ? ""
                                : order.sourceUrl)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="truncate max-w-[250px]">
                            {order.targetUrl}
                          </div>
                          <Button                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0"
                            onClick={() => copyToClipboard(order.targetUrl)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="truncate max-w-[200px]">
                            {order.anchorText}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0"
                            onClick={() => copyToClipboard(order.anchorText)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(order.price).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select
                            value={order.status}
                            onValueChange={(newStatus) => {
                              if (!isActionInProgress) {
                                updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: newStatus
                                });
                              }
                            }}
                            disabled={isActionInProgress}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue>{renderStatusBadge(order.status)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {getStatusOptions()}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="truncate max-w-[180px]">
                            {renderStatusBadge(order.status)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.dateOrdered), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="truncate max-w-[250px]">
                            {order.textEdit || "No content"}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0"
                            onClick={() => copyToClipboard(order.textEdit || '')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="truncate max-w-[200px]">
                            {order.notes || "No notes"}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0"
                            onClick={() => copyToClipboard(order.notes || '')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (!isActionInProgress) {
                                setSelectedOrderId(order.id);
                                // Mark comments as read when clicked using our mutation
                                if (unreadCommentCounts[order.id]) {
                                  markCommentsAsReadMutation.mutate(order.id);
                                }
                              }
                            }}
                            disabled={isActionInProgress}
                            className="relative flex items-center gap-1"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>Comments</span>
                            {unreadCommentCounts[order.id] > 0 && (
                              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                                {unreadCommentCounts[order.id]}
                              </span>
                            )}
                          </Button>
                          {((!["Sent", "Cancelled", "Completed"].includes(order.status) || isAdmin)) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                {isAdmin && (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      if (!isActionInProgress) {
                                        setOrderToEdit(order);
                                      }
                                    }}
                                    disabled={isActionInProgress}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit Order
                                  </DropdownMenuItem>
                                )}
                                {order.status !== "Completed" && order.status !== "Cancelled" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (!isActionInProgress) {
                                        setOrderToCancel(order.id);
                                      }
                                    }}
                                    disabled={isActionInProgress}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel Order
                                  </DropdownMenuItem>
                                )}
                                {isAdmin && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (!isActionInProgress) {
                                        setOrderToDelete(order.id);
                                      }
                                    }}
                                    disabled={isActionInProgress}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Order
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9"
                disabled={currentPage === 1 || isActionInProgress}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>

            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 2 && page <= currentPage + 2)
              ) {
                return (
                  <PaginationItem key={page}>
                    <Button 
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-9 w-9",
                        currentPage === page && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                      )}
                      onClick={() => !isActionInProgress && setCurrentPage(page)}
                      disabled={isActionInProgress || currentPage === page}
                    >
                      {page}
                    </Button>
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
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9"
                disabled={currentPage === totalPages || isActionInProgress}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
      {orderToEdit && (
        <EditOrderSheet
          order={orderToEdit}
          isOpen={!!orderToEdit}
          onOpenChange={(open) => !open && setOrderToEdit(null)}
        />
      )}
      {orderToCancel && (
        <AlertDialog open={true} onOpenChange={() => setOrderToCancel(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this order? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!isActionInProgress) {
                    setIsActionInProgress(true);
                    cancelOrderMutation.mutate(orderToCancel);
                    setOrderToCancel(null);
                  }
                }}
                disabled={isActionInProgress}
              >
                {isActionInProgress ? 
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <AlertDialog open={orderToDelete !== null} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the order and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (orderToDelete && !isActionInProgress) {
                  setIsActionInProgress(true);
                  deleteOrderMutation.mutate(orderToDelete);
                }
              }}
              disabled={isActionInProgress}
            >
              {isActionInProgress ? 
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {selectedOrderId && (
        <Sheet open={selectedOrderId !== null} onOpenChange={() => setSelectedOrderId(null)}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Order Comments</SheetTitle>
              <SheetDescription>
                View and add comments for this order
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div className="h-[60vh] overflow-y-auto space-y-4 pr-4">
                {isLoadingComments ? (
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                ) : (
                  comments.map((comment: any) => (
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
              <div className="space-y-4 pt-4 border-t">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button
                  onClick={() => {
                    if (!isActionInProgress && newComment.trim()) {
                      setIsActionInProgress(true);
                      addCommentMutation.mutate();
                    }
                  }}
                  disabled={!newComment.trim() || isActionInProgress || addCommentMutation.isPending}
                  className="w-full"
                >
                  {(isActionInProgress || addCommentMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Comment
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}