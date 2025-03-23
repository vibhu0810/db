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
import { 
  FileDown, 
  Loader2, 
  MessageSquare, 
  Copy, 
  ChevronDown, 
  X,
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Extract domain from URL
function extractDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (e) {
    return url;
  }
}

// Define the DateRange interface used by the date picker
interface DateRange {
  from?: Date;
  to?: Date;
}

// Define the form data interfaces
interface EditOrderFormData {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  textEdit: string;
  notes: string;
  price: number;
}

// Website interface for guest posts
interface Website {
  name: string;
  url: string;
}

// Define the Order interface
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

// Define Custom Order Form Data
interface CustomOrderFormData {
  userId: number;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  textEdit: string;
  notes: string;
  price: number;
}

// Edit Order Form Component
function EditOrderSheet({
  order,
  isOpen,
  onOpenChange,
}: {
  order: Order;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  // Create update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (data: EditOrderFormData) => {
      const response = await apiRequest(`/api/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          sourceUrl: data.sourceUrl,
          targetUrl: data.targetUrl,
          anchorText: data.anchorText,
          textEdit: data.textEdit,
          notes: data.notes,
          price: data.price
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update order");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order updated",
        description: "The order has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
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

  // Define form state and initial values
  const [formData, setFormData] = useState({
    sourceUrl: order.sourceUrl,
    targetUrl: order.targetUrl,
    anchorText: order.anchorText,
    textEdit: order.textEdit || "",
    notes: order.notes || "",
    price: parseFloat(order.price)
  });

  // Handle form submission
  const onSubmit = (data: EditOrderFormData) => {
    updateOrderMutation.mutate(data);
  };

  const isActionInProgress = 
    updateOrderMutation.isPending;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Edit Order #{order.id}</SheetTitle>
          <SheetDescription>
            Make changes to the order details below.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="sourceUrl" className="text-sm font-medium">Source URL</label>
            <Input
              id="sourceUrl"
              value={formData.sourceUrl}
              onChange={(e) => setFormData({...formData, sourceUrl: e.target.value})}
              placeholder="Source URL"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="targetUrl" className="text-sm font-medium">Target URL</label>
            <Input
              id="targetUrl"
              value={formData.targetUrl}
              onChange={(e) => setFormData({...formData, targetUrl: e.target.value})}
              placeholder="Target URL"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="anchorText" className="text-sm font-medium">Anchor Text</label>
            <Input
              id="anchorText"
              value={formData.anchorText}
              onChange={(e) => setFormData({...formData, anchorText: e.target.value})}
              placeholder="Anchor Text"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="textEdit" className="text-sm font-medium">Text Edit/Content</label>
            <Textarea
              id="textEdit"
              value={formData.textEdit}
              onChange={(e) => setFormData({...formData, textEdit: e.target.value})}
              placeholder="Text Edit Content"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">Notes</label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Add additional notes..."
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium">Price ($)</label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
              placeholder="Price"
            />
          </div>
          <div className="pt-4">
            <Button 
              className="w-full" 
              disabled={isActionInProgress}
              onClick={() => onSubmit(formData)}
            >
              {isActionInProgress && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Order
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Main Orders Component
export default function Orders() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  
  // State for managing order filtering, pagination, and actions
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState<string>("");
  
  // State for custom order form
  const [showCustomOrderSheet, setShowCustomOrderSheet] = useState<boolean>(false);
  
  // Orders per page for pagination
  const itemsPerPage = 10;
  
  // State for resizable columns
  const [columnWidths, setColumnWidths] = useState({
    id: 80,
    client: 150,
    sourceUrl: 200,
    targetUrl: 200,
    anchorText: 150,
    textEdit: 150,
    status: 150,
    price: 100,
    dateOrdered: 150, // Increased from 120px
    comments: 100, // Changed from 80px
    actions: 100,
  });
  
  // Mutation for adding comments
  const addCommentMutation = useMutation({
    mutationFn: async ({ orderId, comment }: { orderId: number; comment: string }) => {
      const response = await apiRequest(`/api/orders/${orderId}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add comment");
      }
  
      return await response.json();
    },
    onSuccess: () => {
      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      if (selectedOrderId) {
        queryClient.invalidateQueries({ queryKey: ["/api/orders", selectedOrderId, "comments"] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Queries for orders, users, and comments
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await apiRequest(`/api/orders`);
      const data = await res.json();
      return data;
    },
  });
  
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest(`/api/users`);
      const data = await res.json();
      return data;
    },
    enabled: isAdmin, // Only fetch users if user is admin
  });
  
  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ["/api/orders", selectedOrderId, "comments"],
    queryFn: async () => {
      if (!selectedOrderId) return [];
      const res = await apiRequest(`/api/orders/${selectedOrderId}/comments`);
      const data = await res.json();
      return data;
    },
    enabled: selectedOrderId !== null,
  });
  
  // Mutation for marking comments as read
  const markCommentsAsReadMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest(`/api/orders/${orderId}/comments/read`, {
        method: "POST",
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to mark comments as read");
      }
  
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for deleting orders
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete order");
      }
  
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order deleted",
        description: "The order has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setOrderToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form for custom order creation
  const customOrderSchema = z.object({
    userId: z.number().optional(),
    sourceUrl: z.string().url("Please enter a valid URL"),
    targetUrl: z.string().url("Please enter a valid URL"),
    anchorText: z.string().min(1, "Anchor text is required"),
    textEdit: z.string().optional(),
    notes: z.string().optional(),
    price: z.number().min(0, "Price must be a positive number"),
  });
  
  const form = useForm<CustomOrderFormData>({
    resolver: zodResolver(customOrderSchema),
    defaultValues: {
      userId: isAdmin ? undefined : user?.id,
      sourceUrl: "",
      targetUrl: "",
      anchorText: "",
      textEdit: "",
      notes: "",
      price: 0,
    },
  });
  
  // Mutation for adding custom orders
  const customOrderMutation = useMutation({
    mutationFn: async (data: CustomOrderFormData) => {
      const response = await apiRequest(`/api/orders`, {
        method: "POST",
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create order");
      }
  
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order created",
        description: "Your order has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setShowCustomOrderSheet(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle custom order form submission
  const onSubmit = (data: CustomOrderFormData) => {
    customOrderMutation.mutate({
      ...data,
      userId: isAdmin ? data.userId : user?.id,
    });
  };
  
  // Detect when API actions are in progress
  const isActionInProgress = 
    addCommentMutation.isPending || 
    markCommentsAsReadMutation.isPending || 
    deleteOrderMutation.isPending;
  
  // Add CSS for resizable columns
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      /* Resizable handle */
      .react-resizable-handle {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 10px;
        height: 100%;
        cursor: col-resize;
        z-index: 1;
      }
      
      /* Horizontal scrolling for tables */
      .table-scroll-container {
        overflow-x: auto;
        max-width: 100%;
      }
      
      .table-content {
        min-width: 1200px; /* Ensures table is wide enough */
      }
      
      /* Truncate long text */
      .truncate-cell {
        max-width: 200px;
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
  
  // Handle column resize
  const onResize = (column: string) => (e: React.SyntheticEvent, { size }: { size: { width: number; height: number } }) => {
    setColumnWidths({
      ...columnWidths,
      [column]: size.width,
    });
  };
  
  // Get appropriate status options based on order type
  const getStatusOptions = (orderType: string | undefined) => {
    // For guest posts
    if (orderType === "guest_post") {
      return (
        <>
          <SelectItem value="In Progress">In Progress</SelectItem>
          <SelectItem value="Approved">Approved</SelectItem>
          <SelectItem value="Content Writing">Content Writing</SelectItem>
          <SelectItem value="Content Review">Content Review</SelectItem>
          <SelectItem value="Published">Published</SelectItem>
          <SelectItem value="Completed">Completed</SelectItem>
          <SelectItem value="Rejected">Rejected</SelectItem>
        </>
      );
    }
    
    // For niche edits
    return (
      <>
        <SelectItem value="In Progress">In Progress</SelectItem>
        <SelectItem value="Sent to Editor">Sent to Editor</SelectItem>
        <SelectItem value="Added">Added</SelectItem>
        <SelectItem value="Completed">Completed</SelectItem>
        <SelectItem value="Rejected">Rejected</SelectItem>
      </>
    );
  };
  
  // If data is loading, show a loading spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter orders based on selected filters
  const filteredOrders = orders
    .filter((order: Order) => {
      // Filter by type (guest post or niche edit)
      if (selectedType !== "all") {
        if (selectedType === "guest_post" && order.sourceUrl !== "not_applicable") {
          return false;
        }
        if (selectedType === "niche_edit" && order.sourceUrl === "not_applicable") {
          return false;
        }
      }

      // Filter by status
      if (selectedStatus !== "all" && order.status !== selectedStatus) {
        return false;
      }

      // Filter by user (admin only)
      if (isAdmin && selectedUser !== "all" && order.userId !== parseInt(selectedUser)) {
        return false;
      }

      // Filter by date range
      if (dateRange.from && new Date(order.dateOrdered) < dateRange.from) {
        return false;
      }
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999); // End of the day
        if (new Date(order.dateOrdered) > toDate) {
          return false;
        }
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const sourceUrl = order.sourceUrl?.toLowerCase() || "";
        const targetUrl = order.targetUrl?.toLowerCase() || "";
        const anchorText = order.anchorText?.toLowerCase() || "";
        const notes = order.notes?.toLowerCase() || "";
        const title = order.title?.toLowerCase() || "";
        const website = order.website?.name?.toLowerCase() || "";

        return (
          sourceUrl.includes(query) ||
          targetUrl.includes(query) ||
          anchorText.includes(query) ||
          notes.includes(query) ||
          title.includes(query) ||
          website.includes(query)
        );
      }

      return true;
    })
    .sort((a: Order, b: Order) => {
      // Sort by date ordered (newest first)
      return new Date(b.dateOrdered).getTime() - new Date(a.dateOrdered).getTime();
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

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
                <Button variant="outline">
                  Add Custom Order
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-xl w-full">
                <SheetHeader>
                  <SheetTitle>Create Custom Order</SheetTitle>
                  <SheetDescription>
                    Create a custom link building order for a client.
                  </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    {isAdmin && (
                      <FormField
                        control={form.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel>Client</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select client" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {users.map((user: any) => (
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
                    )}
                    <FormField
                      control={form.control}
                      name="sourceUrl"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel>Source URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="targetUrl"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel>Target URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://targetsite.com/page" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="anchorText"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel>Anchor Text</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Click here" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="textEdit"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel>Text Edit/Content</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Text to edit or insert" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional notes or instructions" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel>Price ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full mt-6"
                      disabled={isActionInProgress || customOrderMutation.isPending}
                    >
                      {(isActionInProgress || customOrderMutation.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Order
                    </Button>
                  </form>
                </Form>
              </SheetContent>
            </Sheet>
          )}
          <a href="/orders/new">
            <Button>New Order</Button>
          </a>
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
                  <SelectItem value="guest_post">Guest Posts</SelectItem>
                  <SelectItem value="niche_edit">Niche Edits</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {/* Common statuses */}
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  {/* Guest post specific statuses */}
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Content Writing">Content Writing</SelectItem>
                  <SelectItem value="Content Review">Content Review</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                  {/* Niche edit specific statuses */}
                  <SelectItem value="Sent to Editor">Sent to Editor</SelectItem>
                  <SelectItem value="Added">Added</SelectItem>
                </SelectContent>
              </Select>
              
              {isAdmin && (
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {users.map((user: any) => (
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
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setDateRange({})}
                disabled={!dateRange.from && !dateRange.to}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-full"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="table-scroll-container">
          <div className="table-content">
            <Table>
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
                  <div className="flex h-10 items-center justify-between">
                    <TableHead className="font-medium">ID</TableHead>
                  </div>
                </Resizable>

                {isAdmin && (
                  <Resizable
                    width={columnWidths.client}
                    height={40}
                    onResize={onResize("client")}
                    handle={
                      <span className="react-resizable-handle" />
                    }
                  >
                    <div className="flex h-10 items-center justify-between">
                      <TableHead className="font-medium">Client</TableHead>
                    </div>
                  </Resizable>
                )}

                <Resizable
                  width={columnWidths.sourceUrl}
                  height={40}
                  onResize={onResize("sourceUrl")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <div className="flex h-10 items-center justify-between">
                    <TableHead className="font-medium">Source</TableHead>
                  </div>
                </Resizable>

                <Resizable
                  width={columnWidths.targetUrl}
                  height={40}
                  onResize={onResize("targetUrl")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <div className="flex h-10 items-center justify-between">
                    <TableHead className="font-medium">Target URL</TableHead>
                  </div>
                </Resizable>

                <Resizable
                  width={columnWidths.anchorText}
                  height={40}
                  onResize={onResize("anchorText")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <div className="flex h-10 items-center justify-between">
                    <TableHead className="font-medium">Anchor Text</TableHead>
                  </div>
                </Resizable>

                <Resizable
                  width={columnWidths.textEdit}
                  height={40}
                  onResize={onResize("textEdit")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <div className="flex h-10 items-center justify-between">
                    <TableHead className="font-medium">Text Edit/Content</TableHead>
                  </div>
                </Resizable>

                <Resizable
                  width={columnWidths.status}
                  height={40}
                  onResize={onResize("status")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <div className="flex h-10 items-center justify-between">
                    <TableHead className="font-medium">Status</TableHead>
                  </div>
                </Resizable>

                <Resizable
                  width={columnWidths.price}
                  height={40}
                  onResize={onResize("price")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <div className="flex h-10 items-center justify-between">
                    <TableHead className="font-medium">Price</TableHead>
                  </div>
                </Resizable>

                <Resizable
                  width={columnWidths.dateOrdered}
                  height={40}
                  onResize={onResize("dateOrdered")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <div className="flex h-10 items-center justify-between">
                    <TableHead className="font-medium">Date Ordered</TableHead>
                  </div>
                </Resizable>

                <Resizable
                  width={columnWidths.comments}
                  height={40}
                  onResize={onResize("comments")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <div className="flex h-10 items-center justify-between">
                    <TableHead className="font-medium">Comments</TableHead>
                  </div>
                </Resizable>

                <Resizable
                  width={columnWidths.actions}
                  height={40}
                  onResize={onResize("actions")}
                  handle={
                    <span className="react-resizable-handle" />
                  }
                >
                  <div className="flex h-10 items-center justify-between">
                    <TableHead className="font-medium">Actions</TableHead>
                  </div>
                </Resizable>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 11 : 10} className="text-center py-10 text-muted-foreground">
                    No orders found. Try adjusting your filters or create a new order.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order: Order) => {
                  // Determine if this is a guest post or niche edit
                  const isGuestPost = order.sourceUrl === "not_applicable";
                  
                  // Create a display title for source URL column
                  let sourceDisplay = isGuestPost 
                    ? (order.title && order.website 
                        ? `${order.title} - ${order.website.name}` 
                        : (order.title || "N/A"))
                    : order.sourceUrl;

                  // Format the date in a user-friendly way
                  const formattedDate = order.dateOrdered
                    ? format(new Date(order.dateOrdered), "MMM d, yyyy")
                    : "N/A";

                  return (
                    <TableRow 
                      key={order.id}
                      className={cn(
                        "group",
                        order.unreadComments && order.unreadComments > 0 ? "bg-blue-50 dark:bg-blue-950/20" : ""
                      )}
                    >
                      <TableCell className="font-medium">{order.id}</TableCell>
                      
                      {isAdmin && (
                        <TableCell>
                          {users.find((u: any) => u.id === order.userId)?.companyName || 
                           users.find((u: any) => u.id === order.userId)?.username || 
                           "N/A"}
                        </TableCell>
                      )}
                      
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {isGuestPost && order.title ? (
                            <div className="font-medium">{sourceDisplay}</div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="truncate-cell">{sourceDisplay}</span>
                              {order.sourceUrl !== "not_applicable" && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    navigator.clipboard.writeText(order.sourceUrl);
                                    toast({
                                      title: "Copied",
                                      description: "Source URL copied to clipboard",
                                    });
                                  }}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="max-w-xs truncate-cell">
                          <div className="flex items-center gap-2">
                            <span className="truncate-cell">{order.targetUrl}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                navigator.clipboard.writeText(order.targetUrl);
                                toast({
                                  title: "Copied",
                                  description: "Target URL copied to clipboard",
                                });
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="truncate-cell">{order.anchorText}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              navigator.clipboard.writeText(order.anchorText);
                              toast({
                                title: "Copied",
                                description: "Anchor text copied to clipboard",
                              });
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="truncate-cell">
                          {order.textEdit || "N/A"}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {isAdmin ? (
                          <Select 
                            defaultValue={order.status}
                            onValueChange={(value) => {
                              fetch(`/api/orders/${order.id}`, {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json"
                                },
                                body: JSON.stringify({ status: value })
                              })
                              .then(response => {
                                if (!response.ok) throw new Error("Failed to update status");
                                return response.json();
                              })
                              .then(() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                                toast({
                                  title: "Status updated",
                                  description: `Order #${order.id} status changed to ${value}`,
                                });
                              })
                              .catch(error => {
                                toast({
                                  title: "Error",
                                  description: error.message,
                                  variant: "destructive",
                                });
                              });
                            }}
                          >
                            <SelectTrigger className="w-36 h-8">
                              <SelectValue>
                                <StatusBadge status={order.status} />
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {getStatusOptions(isGuestPost ? "guest_post" : "niche_edit")}
                            </SelectContent>
                          </Select>
                        ) : (
                          <StatusBadge status={order.status} />
                        )}
                      </TableCell>
                      
                      <TableCell>${parseFloat(order.price).toFixed(2)}</TableCell>
                      
                      <TableCell>{formattedDate}</TableCell>
                      
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="relative"
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            if (order.unreadComments && order.unreadComments > 0) {
                              markCommentsAsReadMutation.mutate(order.id);
                            }
                          }}
                        >
                          <MessageSquare className="h-5 w-5" />
                          {order.unreadComments && order.unreadComments > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                              {order.unreadComments}
                            </span>
                          )}
                        </Button>
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => setOrderToEdit(order)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                window.open(`/orders/${order.id}`, "_blank");
                              }}
                            >
                              <FileDown className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setOrderToDelete(order.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
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
              
              // Show current page, first page, last page, and pages around current page
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <PaginationItem key={page}>
                    <Button 
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-9 w-9",
                        currentPage === page && "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                      disabled={currentPage === page || isActionInProgress}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  </PaginationItem>
                );
              }
              
              // Show ellipsis between non-continuous pages
              if (
                (page === 2 && currentPage > 3) ||
                (page === totalPages - 1 && currentPage < totalPages - 2)
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (orderToDelete) {
                  deleteOrderMutation.mutate(orderToDelete);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteOrderMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
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
                  <div className="flex items-center justify-center py-10">
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
                      className={`p-3 rounded-lg ${
                        comment.isFromAdmin
                          ? "bg-blue-50 dark:bg-blue-950/20 ml-6"
                          : "bg-gray-100 dark:bg-gray-800 mr-6"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-medium">
                          {comment.isFromAdmin ? "Admin" : "You"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                      <div className="mt-1">{comment.text}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-4 border-t mt-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      if (!newComment.trim()) return;
                      
                      addCommentMutation.mutate({
                        orderId: selectedOrderId,
                        comment: newComment,
                      });
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