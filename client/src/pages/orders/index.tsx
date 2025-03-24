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
import { useLocation } from "wouter";
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
import { MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight, LifeBuoy } from "lucide-react";
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
import { Plus, LifeBuoy as LifeBuoyIcon } from "lucide-react";
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

// Website interface for domain information
interface Website {
  name: string;
  url: string;
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
  website?: Website | null;  // Website information for guest posts
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
  // Create a schema for edit form
  const editOrderSchema = z.object({
    sourceUrl: z.string().min(1, "Source URL is required"),
    targetUrl: z.string().min(1, "Target URL is required"),
    anchorText: z.string().min(1, "Anchor text is required"),
    textEdit: z.string().optional(),
    notes: z.string().optional(),
    price: z.union([z.string(), z.number()]),
  });

  const form = useForm<EditOrderFormData>({
    resolver: zodResolver(editOrderSchema),
    defaultValues: {
      sourceUrl: order.sourceUrl,
      targetUrl: order.targetUrl,
      anchorText: order.anchorText,
      textEdit: order.textEdit || "",
      notes: order.notes || "",
      price: order.price,
    },
    mode: "onTouched", // Only validate fields after they've been touched
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

  useEffect(() => {
    // Log for debugging
    console.log("EditOrderSheet rendered with isOpen:", isOpen, "order:", order);
  }, [isOpen, order]);

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
  
  // Get the edit parameter from URL if present
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [columnWidths, setColumnWidths] = useState({
    sourceUrl: 180,
    targetUrl: 180,
    anchorText: 120,
    textEdit: 120,
    notes: 150, 
    status: 100,
    id: 80,
    price: 80,
    date: 120,
    comments: 80,
    actions: 80,
    user: 120,
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
      comments: 200,
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
  
  // Get orders data first before using in the URL effect
  const { data: ordersData = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: () => {
      const endpoint = isAdmin ? '/api/orders/all' : '/api/orders';
      return apiRequest("GET", endpoint).then(res => res.json());
    },
    refetchInterval: 10000, // Refetch orders every 10 seconds
  });

  // Check for edit parameter in URL when component mounts and orders are loaded
  useEffect(() => {
    // Check for edit parameter in URL
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const editId = urlParams.get('edit');
    
    // Only proceed if we have an editId and orders data has loaded
    if (editId && ordersData.length > 0) {
      const orderId = parseInt(editId, 10);
      const orderToEdit = ordersData.find((order: Order) => order.id === orderId);
      
      if (orderToEdit) {
        // Set the order to edit to open the dialog
        setOrderToEdit(orderToEdit);
        
        // Log for debugging
        console.log(`Setting order to edit: ${orderId}`, orderToEdit);
      } else {
        toast({
          title: "Order not found",
          description: `Could not find order #${editId} to edit`,
          variant: "destructive",
        });
      }
      
      // Remove the edit parameter from URL by redirecting to the orders page
      // This prevents the edit dialog from opening again after it's closed
      setTimeout(() => {
        setLocation('/orders');
      }, 300); // Increased timeout to ensure the dialog has time to open
    }
  }, [ordersData, location, setLocation, toast]);
  
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
      
      setNewComment("");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', selectedOrderId, 'comments'] });
      setIsActionInProgress(false);
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error: Error) => {
      setIsActionInProgress(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setOrderToDelete(null);
      setIsActionInProgress(false);
      toast({
        title: "Order deleted",
        description: "The order has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      setIsActionInProgress(false);
      setOrderToDelete(null);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for handling status change
  const changeStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      setIsActionInProgress(true);
      // Store the current status in case we need to roll back
      const currentOrder = ordersData.find((o: any) => o.id === orderId);
      if (currentOrder) {
        setPreviousOrderStatuses(prev => ({
          ...prev,
          [orderId]: currentOrder.status
        }));
      }
      
      // Record the timestamp of this status update as a user-initiated action
      setRecentStatusUpdates(prev => ({
        ...prev,
        [orderId]: Date.now()
      }));
      
      const res = await apiRequest("PATCH", `/api/orders/${orderId}`, { status });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setIsActionInProgress(false);
      toast({
        title: "Status updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      setIsActionInProgress(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for handling custom order creation
  const customOrderMutation = useMutation({
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
      setShowCustomOrderSheet(false);
      setIsActionInProgress(false);
      toast({
        title: "Order created",
        description: "The custom order has been created successfully.",
      });
    },
    onError: (error: Error) => {
      setIsActionInProgress(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setOrderToCancel(null);
      setIsActionInProgress(false);
      toast({
        title: "Order cancelled",
        description: "The order has been cancelled successfully.",
      });
    },
    onError: (error: Error) => {
      setIsActionInProgress(false);
      setOrderToCancel(null);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const customOrderForm = useForm<CustomOrderFormData>({
    resolver: zodResolver(customOrderSchema),
    defaultValues: {
      userId: user?.id || 0,
      sourceUrl: "",
      targetUrl: "",
      anchorText: "",
      textEdit: "",
      notes: "",
      price: 0,
    },
    mode: "onTouched", // Only validate fields after they've been touched
  });

  const onSubmit = (data: CustomOrderFormData) => {
    customOrderMutation.mutate(data);
  };

  // Determine if the order is a niche edit or guest post
  const getOrderType = (order: any) => {
    // Order is guest post if sourceUrl is "not_applicable" or if it has a website field
    if (order.sourceUrl === "not_applicable" || order.website) {
      return "guest_post";
    }
    return "niche_edit";
  };

  // Function to render proper order status options based on order type
  const renderStatusOptions = (order: any) => {
    const orderType = getOrderType(order);
    
    if (orderType === "guest_post") {
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
    } else {
      return (
        <>
          <SelectItem value="In Progress">In Progress</SelectItem>
          <SelectItem value="Sent to Editor">Sent to Editor</SelectItem>
          <SelectItem value="Completed">Completed</SelectItem>
          <SelectItem value="Rejected">Rejected</SelectItem>
          <SelectItem value="Cancelled">Cancelled</SelectItem>
        </>
      );
    }
  };

  // Filter and sort orders
  const filteredOrders = ordersData
    .filter((order: Order) => {
      // Filter by type (niche edit or guest post)
      if (selectedType !== "all") {
        const orderType = getOrderType(order);
        if (selectedType !== orderType) {
          return false;
        }
      }
      
      // Filter by status
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }
      
      // Filter by user
      if (isAdmin && userFilter !== "all" && order.userId !== userFilter) {
        return false;
      }
      
      // Filter by search query
      const searchFields = [
        order.sourceUrl,
        order.targetUrl, 
        order.anchorText,
        order.textEdit,
        order.notes,
        order.title,
        order.status,
        order.id?.toString()
      ].filter(Boolean).map(field => field?.toLowerCase());
      
      if (searchQuery && !searchFields.some(field => field && field.includes(searchQuery.toLowerCase()))) {
        return false;
      }
      
      // Filter by date range
      if (dateRange.from) {
        const orderDate = new Date(order.dateOrdered);
        if (orderDate < dateRange.from) {
          return false;
        }
      }
      
      if (dateRange.to) {
        const orderDate = new Date(order.dateOrdered);
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        if (orderDate > endOfDay) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a: Order, b: Order) => {
      // For dateOrdered field
      if (sortField === "dateOrdered") {
        const dateA = new Date(a.dateOrdered).getTime();
        const dateB = new Date(b.dateOrdered).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      }
      
      // For other string fields
      const valA = String(a[sortField as keyof Order] || "").toLowerCase();
      const valB = String(b[sortField as keyof Order] || "").toLowerCase();
      
      if (sortDirection === "asc") {
        return valA.localeCompare(valB);
      } else {
        return valB.localeCompare(valA);
      }
    });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const resetFilters = () => {
    setStatusFilter("all");
    setSearchQuery("");
    setDateRange({});
    setUserFilter("all");
    setSelectedType("all");
  };

  // If data is loading, show a loading spinner
  if (isLoadingOrders) {
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
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Order
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Create Custom Order</SheetTitle>
                  <SheetDescription>
                    Create a custom order for a specific user.
                  </SheetDescription>
                </SheetHeader>
                <Form {...customOrderForm}>
                  <form onSubmit={customOrderForm.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <FormField
                      control={customOrderForm.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select user" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((user: User) => (
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
                      control={customOrderForm.control}
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
                      control={customOrderForm.control}
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
                      control={customOrderForm.control}
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
                      control={customOrderForm.control}
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
                      control={customOrderForm.control}
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
                      control={customOrderForm.control}
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
                      disabled={customOrderMutation.isPending || isActionInProgress}
                    >
                      {(customOrderMutation.isPending || isActionInProgress) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Order
                    </Button>
                  </form>
                </Form>
              </SheetContent>
            </Sheet>
          )}
          {/* New Order button removed as requested */}
        </div>
      </div>

      <div className="bg-background rounded-md border shadow-sm">
        {/* Filters Row */}
        <div className="p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex gap-2 sm:gap-4">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="niche_edit">Niche Edit</SelectItem>
                  <SelectItem value="guest_post">Guest Post</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
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
                <Select value={userFilter.toString()} onValueChange={(value) => setUserFilter(value === "all" ? "all" : parseInt(value))}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter by user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((user: User) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.companyName || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="flex gap-2">
              <DatePickerWithRange 
                date={dateRange} 
                setDate={setDateRange}
                className="w-full sm:w-auto" 
              />
              <Button variant="outline" size="icon" onClick={resetFilters}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[300px]"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto" style={{ maxWidth: '100vw' }}>
          <Table style={{ minWidth: '1140px' }}>
            <TableHeader>
              <TableRow>
                <Resizable
                  width={columnWidths.id}
                  height={40}
                  onResize={onResize("id")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <TableHead style={{ width: columnWidths.id }}>
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => {
                        setSortField("id");
                        setSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                    >
                      ID
                      {sortField === "id" && (
                        <ChevronDown 
                          className={cn(
                            "ml-1 h-4 w-4", 
                            sortDirection === "asc" ? "rotate-180 transform" : ""
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                </Resizable>
                
                <Resizable
                  width={columnWidths.sourceUrl}
                  height={40}
                  onResize={onResize("sourceUrl")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <TableHead style={{ width: columnWidths.sourceUrl }}>
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => {
                        setSortField("sourceUrl");
                        setSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                    >
                      Source URL/Guest Post Title
                      {sortField === "sourceUrl" && (
                        <ChevronDown 
                          className={cn(
                            "ml-1 h-4 w-4", 
                            sortDirection === "asc" ? "rotate-180 transform" : ""
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                </Resizable>
                
                <Resizable
                  width={columnWidths.targetUrl}
                  height={40}
                  onResize={onResize("targetUrl")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <TableHead style={{ width: columnWidths.targetUrl }}>
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => {
                        setSortField("targetUrl");
                        setSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                    >
                      Target URL
                      {sortField === "targetUrl" && (
                        <ChevronDown 
                          className={cn(
                            "ml-1 h-4 w-4", 
                            sortDirection === "asc" ? "rotate-180 transform" : ""
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                </Resizable>
                
                <Resizable
                  width={columnWidths.anchorText}
                  height={40}
                  onResize={onResize("anchorText")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <TableHead style={{ width: columnWidths.anchorText }}>
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => {
                        setSortField("anchorText");
                        setSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                    >
                      Anchor Text
                      {sortField === "anchorText" && (
                        <ChevronDown 
                          className={cn(
                            "ml-1 h-4 w-4", 
                            sortDirection === "asc" ? "rotate-180 transform" : ""
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                </Resizable>
                
                <Resizable
                  width={columnWidths.textEdit}
                  height={40}
                  onResize={onResize("textEdit")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <TableHead style={{ width: columnWidths.textEdit }}>
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => {
                        setSortField("textEdit");
                        setSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                    >
                      Text Edit/Content
                      {sortField === "textEdit" && (
                        <ChevronDown 
                          className={cn(
                            "ml-1 h-4 w-4", 
                            sortDirection === "asc" ? "rotate-180 transform" : ""
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                </Resizable>
                
                <Resizable
                  width={columnWidths.status}
                  height={40}
                  onResize={onResize("status")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <TableHead style={{ width: columnWidths.status }}>
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => {
                        setSortField("status");
                        setSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                    >
                      Status
                      {sortField === "status" && (
                        <ChevronDown 
                          className={cn(
                            "ml-1 h-4 w-4", 
                            sortDirection === "asc" ? "rotate-180 transform" : ""
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                </Resizable>
                
                <Resizable
                  width={columnWidths.price}
                  height={40}
                  onResize={onResize("price")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <TableHead style={{ width: columnWidths.price }}>
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => {
                        setSortField("price");
                        setSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                    >
                      Price
                      {sortField === "price" && (
                        <ChevronDown 
                          className={cn(
                            "ml-1 h-4 w-4", 
                            sortDirection === "asc" ? "rotate-180 transform" : ""
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                </Resizable>
                
                <Resizable
                  width={columnWidths.date}
                  height={40}
                  onResize={onResize("date")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <TableHead style={{ width: columnWidths.date }}>
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => {
                        setSortField("dateOrdered");
                        setSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                    >
                      Date Ordered
                      {sortField === "dateOrdered" && (
                        <ChevronDown 
                          className={cn(
                            "ml-1 h-4 w-4", 
                            sortDirection === "asc" ? "rotate-180 transform" : ""
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                </Resizable>
                
                {isAdmin && (
                  <Resizable
                    width={columnWidths.user}
                    height={40}
                    onResize={onResize("user")}
                    handle={
                      <span className="react-resizable-handle" />
                    }
                  >
                    <TableHead style={{ width: columnWidths.user }}>User</TableHead>
                  </Resizable>
                )}
                
                <Resizable
                  width={columnWidths.comments}
                  height={40}
                  onResize={onResize("comments")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <TableHead style={{ width: columnWidths.comments }}>Comments</TableHead>
                </Resizable>
                
                <Resizable
                  width={columnWidths.actions}
                  height={40}
                  onResize={onResize("actions")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <TableHead style={{ width: columnWidths.actions }}>Actions</TableHead>
                </Resizable>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-10">
                    No orders found. Try adjusting your filters or creating a new order.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order: Order) => {
                  const isGuestPost = getOrderType(order) === "guest_post";
                  const sourceDisplay = isGuestPost 
                    ? (order.title || "Untitled") + (order.website ? ` - ${order.website.name}` : "")
                    : order.sourceUrl;
                    
                  return (
                    <TableRow 
                      key={order.id}
                      className={cn(
                        highlightedOrderId === order.id && "bg-muted/50"
                      )}
                    >
                      <TableCell>
                        <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                          {order.id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {order.sourceUrl === "not_applicable" ? (
                            <div className="font-medium">{sourceDisplay}</div>
                          ) : (
                            <a 
                              href={order.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:underline truncate-cell block"
                            >
                              {sourceDisplay}
                            </a>
                          )}
                          {isGuestPost && order.website && (
                            <span className="text-sm text-muted-foreground block truncate-cell">
                              {order.website.url}
                            </span>
                          )}
                          {!isGuestPost && (
                            <div className="flex items-center">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 ml-1" 
                                onClick={() => {
                                  navigator.clipboard.writeText(order.sourceUrl);
                                  toast({
                                    description: "URL copied to clipboard",
                                    duration: 2000
                                  });
                                }}
                                title="Copy URL"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <a 
                          href={order.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline truncate-cell block"
                        >
                          {order.targetUrl}
                        </a>
                        <div className="flex items-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 ml-1" 
                            onClick={() => {
                              navigator.clipboard.writeText(order.targetUrl);
                              toast({
                                description: "URL copied to clipboard",
                                duration: 2000
                              });
                            }}
                            title="Copy URL"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate-cell">
                          {order.anchorText || "N/A"}
                        </div>
                        <div className="flex items-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 ml-1" 
                            onClick={() => {
                              navigator.clipboard.writeText(order.anchorText || "");
                              toast({
                                description: "Anchor text copied to clipboard",
                                duration: 2000
                              });
                            }}
                            title="Copy anchor text"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate-cell">
                          {order.textEdit || "N/A"}
                        </div>
                        {order.textEdit && (
                          <div className="flex items-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 ml-1" 
                              onClick={() => {
                                navigator.clipboard.writeText(order.textEdit || "");
                                toast({
                                  description: "Text edit copied to clipboard",
                                  duration: 2000
                                });
                              }}
                              title="Copy text edit"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select
                            defaultValue={order.status}
                            onValueChange={(value) => {
                              if (value !== order.status && !isActionInProgress) {
                                changeStatusMutation.mutate({
                                  orderId: order.id,
                                  status: value
                                });
                              }
                            }}
                            disabled={isActionInProgress}
                          >
                            <SelectTrigger className="w-full">
                              <StatusBadge status={order.status} />
                            </SelectTrigger>
                            <SelectContent>
                              {renderStatusOptions(order)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <StatusBadge status={order.status} />
                        )}
                      </TableCell>
                      <TableCell>
                        ${Number(order.price).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.dateOrdered), "MMM d, yyyy")}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {users.find((u: User) => u.id === order.userId)?.companyName || 
                           users.find((u: User) => u.id === order.userId)?.username || 
                           "Unknown"}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            // Mark comments as read when opening the comments sheet
                            if (unreadCommentCounts[order.id]) {
                              markCommentsAsReadMutation.mutate(order.id);
                            }
                          }}
                          className="relative"
                        >
                          <MessageSquare className="h-4 w-4" />
                          {unreadCommentCounts[order.id] > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">
                              {unreadCommentCounts[order.id]}
                            </span>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/orders/${order.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            {order.status === "In Progress" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setOrderToEdit(order);
                                }}
                              >
                                Edit Order
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => window.location.href = `/orders/${order.id}#support`}
                            >
                              <LifeBuoyIcon className="h-4 w-4 mr-2" />
                              Support
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {order.status === "In Progress" && (
                              <DropdownMenuItem
                                onClick={() => setOrderToCancel(order.id)}
                                className="text-orange-600"
                              >
                                Cancel Order
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() => setOrderToDelete(order.id)}
                                className="text-red-600"
                              >
                                Delete Order
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Pagination */}
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
            
            {Array.from({ length: totalPages }).map((_, index) => {
              const page = index + 1;
              // Show first 3 pages, last 3 pages, and pages around current page
              if (
                page <= 3 ||
                page > totalPages - 3 ||
                (page >= currentPage - 1 && page <= currentPage + 1)
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
                (page === 4 && currentPage > 4) ||
                (page === totalPages - 3 && currentPage < totalPages - 3)
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
      
      {/* Delete Order Confirmation Dialog */}
      <AlertDialog
        open={orderToDelete !== null}
        onOpenChange={(open) => !open && setOrderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the order and all related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionInProgress}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (orderToDelete) {
                  deleteOrderMutation.mutate(orderToDelete);
                }
              }}
              disabled={isActionInProgress}
              className="bg-red-600 hover:bg-red-700"
            >
              {isActionInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog
        open={orderToCancel !== null}
        onOpenChange={(open) => !open && setOrderToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This will change the order status to "Cancelled".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionInProgress}>No, Keep It</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (orderToCancel) {
                  cancelOrderMutation.mutate(orderToCancel);
                }
              }}
              disabled={isActionInProgress}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isActionInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comments Sheet */}
      {selectedOrderId && (
        <Sheet
          open={selectedOrderId !== null}
          onOpenChange={(open) => !open && setSelectedOrderId(null)}
        >
          <SheetContent className="sm:max-w-xl w-full">
            <SheetHeader>
              <SheetTitle>Order Comments</SheetTitle>
              <SheetDescription>
                View and add comments for Order #{selectedOrderId}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pb-4">
                {isLoadingComments ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No comments yet. Add the first comment below.
                  </div>
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

      {/* Edit Order Sheet */}
      {orderToEdit && (
        <EditOrderSheet
          order={orderToEdit}
          isOpen={orderToEdit !== null}
          onOpenChange={(open) => !open && setOrderToEdit(null)}
        />
      )}
    </div>
  );
}