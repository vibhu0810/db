import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { countries } from "@/lib/countries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  AlertTriangle, 
  Trash, 
  Upload, 
  FileText, 
  Filter, 
  FileCheck, 
  FileX, 
  Download,
  Loader2,
  Check, 
  Clock,
  Banknote,
  MoreHorizontal,
  Pencil,
  Search
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { uploadFile } from "@/utils/uploadthing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentDetails } from "@/components/ui/payment-details";

interface DateRange {
  from: Date | undefined;
  to?: Date;
}

interface Invoice {
  id: number;
  userId: number;
  amount: number;
  notes: string | null;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  createdAt: string;
  fileUrl: string;
  fileName: string;
  paidAt: string | null;
  clientEmail?: string; // New field for email
  paymentMethod?: string; // "paypal" or "wire"
  paymentFee?: number; // Fee amount in cents
}

interface InvoiceWithUser extends Invoice {
  user?: {
    username: string;
    companyName: string;
    email: string;
  };
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function getDomainName(url: string): string {
  try {
    // Handle URLs without protocol by prepending http:// temporarily
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch (e) {
    return url; // Return original if parsing fails
  }
}

function CreateInvoiceDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [previewStep, setPreviewStep] = useState(false);
  
  // Automatically calculated fields from completed orders
  const [totalAmount, setTotalAmount] = useState(0);
  const [invoiceDescription, setInvoiceDescription] = useState("");
  
  // Query for clients to select for invoice
  console.log("Client query setup. User admin:", !!user?.is_admin, "Dialog open:", open);
  
  // State to store clients
  const [availableClients, setAvailableClients] = useState<any[]>([]);

  // Direct fetch using useEffect instead of React Query
  useEffect(() => {
    if (user?.is_admin) {
      console.log("Fetching clients from /api/users directly");
      
      fetch("/api/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
        .then((res) => {
          console.log("Fetch response status:", res.status);
          return res.json();
        })
        .then((data) => {
          console.log("Fetch successful, client data:", data);
          setAvailableClients(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("Error fetching clients:", err);
          setAvailableClients([]);
        });
    }
  }, [user?.is_admin, open]);
  
  // Dummy query just to maintain API with existing code
  const clientsQuery = {
    data: availableClients,
    isLoading: false,
    isSuccess: true,
    isError: false,
  };

  // State to store completed orders
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  
  // Effect to fetch completed orders when user changes
  useEffect(() => {
    if (!selectedUser) {
      setCompletedOrders([]);
      return;
    }
    
    console.log("Fetching completed orders for user:", selectedUser);
    
    // Directly fetch from the completed-unbilled endpoint with authenticated request
    // Made specifically for the admin to view unbilled completed orders
    fetch(`/api/orders/completed-unbilled/${selectedUser}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important to include credentials for auth
    })
      .then(res => {
        console.log("Completed orders fetch status:", res.status);
        if (!res.ok) {
          throw new Error(`Failed to fetch orders: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log("Completed orders found:", data);
        
        // If we got an array of orders, use it
        if (Array.isArray(data)) {
          // We trust the endpoint to return the correct orders
          // but we'll still double-check that they're completed
          const filteredOrders = data.filter(order => 
            order.dateCompleted || 
            order.status === 'Completed' || // Capital 'C' in Completed
            order.status === 'completed' ||
            order.status === 'guest_post_published' ||
            order.status === 'niche_edit_published'
          );
          
          console.log("Filtered completed orders:", filteredOrders);
          setCompletedOrders(filteredOrders);
        } else {
          console.error("Expected array of orders but got:", data);
          setCompletedOrders([]);
        }
      })
      .catch(error => {
        console.error("Error fetching completed orders:", error);
        setCompletedOrders([]);
      });
  }, [selectedUser]);
  
  // Dummy query object to maintain compatibility with existing code
  const completedOrdersQuery = {
    data: completedOrders,
    isLoading: false,
    isSuccess: true,
    isError: false,
  };

  // State to store domains for reference
  const [domains, setDomains] = useState<any[]>([]);
  
  // State for admin billing details
  const [adminDetails, setAdminDetails] = useState<any>({
    companyName: user?.companyName || "SaaSxLinks.ai",
    email: user?.email || "contact@saasxlinks.ai",
    billingAddress: user?.billingAddress || ""
  });
  
  // Client email for billing (required)
  const [clientEmail, setClientEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  
  // Payment option selection (PayPal vs Wire Transfer)
  const [paymentOption, setPaymentOption] = useState<string>("");
  const [paymentOptionError, setPaymentOptionError] = useState<string>("");
  
  // For due date selection
  const [dueDate, setDueDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Default 30 days
    return date;
  });
  
  // Fetch domains for getting website names
  useEffect(() => {
    if (!user?.is_admin) return;
    
    fetch("/api/domains", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDomains(data);
        }
      })
      .catch(error => {
        console.error("Error fetching domains:", error);
      });
  }, [user]);
  
  // Helper function to find domain name from sourceUrl
  const getDomainName = (sourceUrl: string): string => {
    if (!sourceUrl || sourceUrl === 'not_applicable') return 'Unknown Domain';
    
    // Try to find the domain in our domains list
    const domain = domains.find(d => 
      sourceUrl.includes(d.websiteUrl) || 
      (d.websiteName && sourceUrl.toLowerCase().includes(d.websiteName.toLowerCase()))
    );
    
    if (domain) {
      return domain.websiteName || domain.websiteUrl;
    }
    
    // Try to extract domain from URL if we couldn't find it in our list
    try {
      // Remove protocol if present
      let cleanUrl = sourceUrl.replace(/^(https?:\/\/)?(www\.)?/, '');
      // Get domain part (before first /)
      cleanUrl = cleanUrl.split('/')[0];
      return cleanUrl;
    } catch (e) {
      return sourceUrl;
    }
  };

  // Generate invoice description based on order type
  const generateInvoiceDescription = (order: any) => {
    const orderId = order.id;
    const price = order.price;
    const domainName = getDomainName(order.sourceUrl);
    
    // Check if it's a guest post
    if (order.status === "guest_post_published" || 
        (order.type === "guest_post" && order.status === "completed") ||
        order.status === "Completed") {
      return `Link Building Services - #${orderId} - ${domainName} (${order.title || 'Guest Post'}) - $${price}`;
    } 
    // Otherwise it's a niche edit
    else {
      return `Link Building Services - #${orderId} - ${domainName} - $${price}`;
    }
  };
  
  // When selected user changes, calculate invoice details
  useEffect(() => {
    if (!completedOrdersQuery.data || completedOrdersQuery.data.length === 0) {
      setTotalAmount(0);
      setInvoiceDescription("");
      setPreviewStep(false);
      return;
    }
    
    // Find the selected client's details
    if (selectedUser && clientsQuery.data) {
      const client = clientsQuery.data.find((u: any) => u.id === selectedUser);
      setSelectedClient(client);
    }
    
    // Calculate total from all orders
    const total = completedOrdersQuery.data.reduce((sum: number, order: any) => {
      const price = parseFloat(order.price);
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
    
    setTotalAmount(total);
    
    // Generate invoice description based on all orders
    const descriptions = completedOrdersQuery.data.map((order: any, index: number) => 
      `${index + 1}. ${generateInvoiceDescription(order)}`
    );
    setInvoiceDescription(descriptions.join('\n'));
    
    // Automatically move to preview step when we have orders
    if (completedOrdersQuery.data.length > 0) {
      setPreviewStep(true);
    }
  }, [completedOrdersQuery.data, selectedUser, clientsQuery.data]);

  // Reset form and go back to client selection
  const resetForm = () => {
    setSelectedUser(null);
    setSelectedClient(null);
    setPreviewStep(false);
    setTotalAmount(0);
    setInvoiceDescription("");
    setClientEmail("");
    setEmailError("");
    setPaymentOption("");
    setPaymentOptionError("");
  };

  // Validate form before submission
  const validateForm = () => {
    let isValid = true;
    
    // Check if email is provided
    if (!clientEmail) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(clientEmail)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    } else {
      setEmailError("");
    }
    
    // Check if payment option is selected
    if (!paymentOption) {
      setPaymentOptionError("Payment option is required");
      isValid = false;
    } else {
      setPaymentOptionError("");
    }
    
    return isValid;
  };
  
  // Create and send the invoice
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      // First validate the form
      if (!validateForm()) {
        throw new Error("Please fill in all required fields");
      }
      
      // Calculate final amount based on payment option
      const finalAmount = paymentOption === "paypal" 
        ? totalAmount * 1.05 // 5% PayPal fee
        : totalAmount;
      
      const invoiceData = {
        userId: selectedUser,
        amount: Math.round(finalAmount * 100), // Convert to cents for storage
        notes: invoiceDescription,
        dueDate: dueDate.toISOString(), // Use the selected date from the datepicker
        status: 'pending',
        fileName: 'invoice.pdf',
        fileUrl: '',
        clientEmail: clientEmail,
        paymentMethod: paymentOption,
        paymentFee: paymentOption === "paypal" ? (totalAmount * 0.05) : 0,
      };
      
      const response = await apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice created and sent to client",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/all'] });
      setOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  if (!user?.is_admin) return null;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetForm();
      }
      setOpen(newOpen);
    }}>
      <DialogTrigger asChild>
        <Button className="ml-auto">
          <Upload className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{previewStep ? "Invoice Preview" : "Create New Invoice"}</DialogTitle>
          <DialogDescription>
            {previewStep 
              ? "Review and approve this invoice to send to the client" 
              : "Select a client to generate an invoice from their completed orders"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Step 1: Client Selection */}
        {!previewStep && (
          <div className="py-6">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right">
                Client <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3">
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedUser?.toString() || ""}
                  onChange={(e) => setSelectedUser(Number(e.target.value))}
                >
                  <option value="">Select a client</option>
                  {Array.isArray(clientsQuery.data) && clientsQuery.data.length > 0 && 
                    clientsQuery.data.map((client: any) => (
                      <option key={client.id} value={client.id.toString()}>
                        {client.companyName || client.username}
                      </option>
                    ))
                  }
                </select>
                
                {clientsQuery.isLoading && (
                  <p className="text-xs text-muted-foreground mt-1">Loading clients...</p>
                )}
                
                {clientsQuery.isSuccess && Array.isArray(clientsQuery.data) && clientsQuery.data.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No clients found</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Step 2: Order Preview */}
        {previewStep && (
          <div className="py-6">
            {/* Basic Invoice Details */}
            <div className="grid grid-cols-1 gap-4 mb-4">
              <h3 className="text-base font-medium">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">From</p>
                  <p className="text-sm">{adminDetails.companyName}</p>
                  <p className="text-sm">{adminDetails.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">To</p>
                  <p className="text-sm">{selectedClient?.companyName || selectedClient?.username}</p>
                  
                  {/* Client Email Input (NEW) */}
                  <div className="mt-2">
                    <Label htmlFor="clientEmail">Client Email <span className="text-red-500">*</span></Label>
                    <Input 
                      id="clientEmail"
                      type="email" 
                      value={clientEmail} 
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@example.com"
                      className={emailError ? "border-red-500" : ""}
                    />
                    {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                  </div>
                </div>
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="amount">Total Amount</Label>
                  <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input 
                    id="dueDate"
                    type="date" 
                    value={dueDate.toISOString().split('T')[0]}
                    onChange={(e) => setDueDate(new Date(e.target.value))}
                  />
                </div>
              </div>
              
              {/* Payment Options (NEW) */}
              <div className="mt-2">
                <Label htmlFor="paymentOption">Payment Method <span className="text-red-500">*</span></Label>
                <select
                  id="paymentOption"
                  className={`flex h-10 w-full rounded-md border ${paymentOptionError ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                  value={paymentOption}
                  onChange={(e) => setPaymentOption(e.target.value)}
                >
                  <option value="">Select payment method</option>
                  <option value="paypal">PayPal (5% fee)</option>
                  <option value="wire">Wire Transfer / Wise (0% fee)</option>
                </select>
                {paymentOptionError && <p className="text-red-500 text-xs mt-1">{paymentOptionError}</p>}
                
                {/* Show payment fee if PayPal is selected */}
                {paymentOption === 'paypal' && (
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">Service Fee (5%):</span> {formatCurrency(totalAmount * 0.05)}
                    <p className="font-medium mt-1">Final Amount: {formatCurrency(totalAmount * 1.05)}</p>
                  </div>
                )}

                {/* Show payment details based on selected method */}
                {paymentOption && (
                  <div className="mt-4 rounded-md bg-muted p-4">
                    <PaymentDetails paymentMethod={paymentOption} />
                  </div>
                )}
              </div>

              {/* Invoice Description */}
              <div className="mt-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={invoiceDescription} 
                  onChange={(e) => setInvoiceDescription(e.target.value)}
                  rows={8}
                />
              </div>
            </div>
            
            {/* Orders Summary */}
            <div className="border rounded-md p-4 mt-4">
              <h3 className="text-base font-medium mb-2">Orders Included ({completedOrdersQuery.data.length})</h3>
              <div className="max-h-40 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedOrdersQuery.data.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell>#{order.id}</TableCell>
                        <TableCell>
                          {getDomainName(order.sourceUrl)}
                          {order.title && ` (${order.title})`}
                        </TableCell>
                        <TableCell className="text-right">${order.price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
        
        <DialogFooter>
          {previewStep ? (
            <>
              <Button variant="outline" onClick={() => setPreviewStep(false)}>
                Back
              </Button>
              <Button 
                onClick={() => createInvoiceMutation.mutate()} 
                disabled={createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create & Send Invoice"
                )}
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => {
                if (selectedUser) {
                  if (completedOrdersQuery.data && completedOrdersQuery.data.length > 0) {
                    setPreviewStep(true);
                  } else {
                    toast({
                      title: "No Completed Orders",
                      description: "This client has no completed unbilled orders to invoice",
                      variant: "destructive",
                    });
                  }
                } else {
                  toast({
                    title: "Select a Client",
                    description: "Please select a client to continue",
                    variant: "destructive",
                  });
                }
              }}
              disabled={!selectedUser}
            >
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminInvoicesTab() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined });
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Function to get country name from country code
  const getCountryName = (countryCode: string) => {
    const country = countries.find(c => 
      typeof c === 'object' && c.value === countryCode
    );
    return country ? country.label : countryCode;
  };
  
  // Fetch all invoices from API
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/invoices/all", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch invoices: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setInvoices(data);
        } else {
          console.error("Expected array of invoices but got:", data);
          setInvoices([]);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching invoices:", error);
        toast({
          title: "Error",
          description: "Failed to load invoices",
          variant: "destructive",
        });
        setInvoices([]);
        setIsLoading(false);
      });
  }, [toast]);
  
  // Mark invoice as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await apiRequest(`/api/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice marked as paid",
      });
      // Refresh invoices list
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/all'] });
      
      // Update the local state
      setInvoices(invoices.map(inv => 
        inv.id === selectedInvoice?.id 
          ? { ...inv, status: "paid", paidAt: new Date().toISOString() } 
          : inv
      ));
      
      // Update selected invoice if it's still open
      if (selectedInvoice) {
        setSelectedInvoice({
          ...selectedInvoice,
          status: "paid",
          paidAt: new Date().toISOString()
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark invoice as paid",
        variant: "destructive",
      });
    },
  });
  
  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await apiRequest(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
      // Refresh invoices list
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/all'] });
      
      // Update local state
      setInvoices(invoices.filter(inv => inv.id !== selectedInvoice?.id));
      setSelectedInvoice(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });
  
  // Apply filters
  const filteredInvoices = invoices
    .filter(invoice => {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const username = invoice.user?.username?.toLowerCase() || '';
        const companyName = invoice.user?.companyName?.toLowerCase() || '';
        const email = invoice.user?.email?.toLowerCase() || '';
        const invoiceId = invoice.id.toString();
        
        return username.includes(query) || 
               companyName.includes(query) || 
               email.includes(query) ||
               invoiceId.includes(query);
      }
      return true;
    })
    .filter(invoice => {
      // Apply date filter
      if (dateRange.from) {
        const invoiceDate = new Date(invoice.createdAt);
        if (dateRange.to) {
          return invoiceDate >= dateRange.from && invoiceDate <= dateRange.to;
        }
        return invoiceDate >= dateRange.from;
      }
      return true;
    })
    .filter(invoice => {
      // Apply status filter
      if (statusFilter && statusFilter !== "all") {
        return invoice.status === statusFilter;
      }
      return true;
    });
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <DatePickerWithRange
            date={dateRange}
            setDate={setDateRange}
            className="w-full sm:w-auto"
          />
          
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          
          <CreateInvoiceDialog />
        </div>
      </div>
      
      {/* Invoices Table */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-10 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">No Invoices Found</h3>
          <p className="text-muted-foreground">
            {searchQuery || dateRange.from || statusFilter
              ? "Try adjusting your search or filters"
              : "Create your first invoice to get started"}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice: InvoiceWithUser) => (
                <TableRow key={invoice.id}>
                  <TableCell>#{invoice.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{invoice.user?.companyName || invoice.user?.username || "Unknown"}</div>
                    <div className="text-sm text-muted-foreground">{invoice.user?.email || ""}</div>
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.amount / 100)}</TableCell>
                  <TableCell>{format(new Date(invoice.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                    {new Date(invoice.dueDate) < new Date() && invoice.status === 'pending' && (
                      <Badge variant="destructive" className="ml-2">
                        Overdue
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.status === 'paid' ? 'outline' :
                        invoice.status === 'overdue' ? 'destructive' : 'default'
                      }
                    >
                      {invoice.status === 'paid' ? (
                        <span className="flex items-center">
                          <Check className="mr-1 h-3 w-3" />
                          Paid
                        </span>
                      ) : invoice.status === 'overdue' ? (
                        <span className="flex items-center">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Overdue
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <FileText className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Invoice details dialog */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Invoice #{selectedInvoice.id}</DialogTitle>
              <DialogDescription>
                {selectedInvoice.status === 'paid' 
                  ? `Paid on ${selectedInvoice.paidAt ? format(new Date(selectedInvoice.paidAt), 'MMMM d, yyyy') : 'Unknown date'}`
                  : `Due on ${format(new Date(selectedInvoice.dueDate), 'MMMM d, yyyy')}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-semibold">From</h3>
                  <p>Digital Gratified FZ-LLC</p>
                  <p>Dubai Silicon Oasis</p>
                  <p>United Arab Emirates</p>
                </div>
                <div className="text-right">
                  <h3 className="font-semibold">To</h3>
                  <p>{(selectedInvoice as InvoiceWithUser).user?.companyName || (selectedInvoice as InvoiceWithUser).user?.username || "Unknown"}</p>
                  <p>{selectedInvoice.clientEmail || (selectedInvoice as InvoiceWithUser).user?.email || ""}</p>
                  <p>{(selectedInvoice as InvoiceWithUser).user?.country ? getCountryName((selectedInvoice as InvoiceWithUser).user.country) : ""}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="whitespace-pre-line">
                          {selectedInvoice.notes || "Link Building Services"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(selectedInvoice.amount / 100)}
                        </TableCell>
                      </TableRow>
                      {selectedInvoice.paymentFee ? (
                        <TableRow>
                          <TableCell>PayPal Service Fee (5%)</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(selectedInvoice.paymentFee)}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <Badge 
                    variant={
                      selectedInvoice.status === 'paid' ? 'outline' :
                      selectedInvoice.status === 'overdue' ? 'destructive' : 'default'
                    }
                    className="text-base py-1 px-3"
                  >
                    {selectedInvoice.status === 'paid' ? (
                      <span className="flex items-center">
                        <Check className="mr-1 h-4 w-4" />
                        Paid
                      </span>
                    ) : selectedInvoice.status === 'overdue' ? (
                      <span className="flex items-center">
                        <AlertTriangle className="mr-1 h-4 w-4" />
                        Overdue
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        Pending
                      </span>
                    )}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(selectedInvoice.amount / 100)}
                  </p>
                </div>
              </div>
              
              {/* Payment Method Information */}
              {selectedInvoice.paymentMethod && (
                <div className="pt-2">
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Payment Method</h3>
                    <p className="mb-2">
                      {selectedInvoice.paymentMethod === 'paypal' 
                        ? 'PayPal (5% fee)' 
                        : 'Wire Transfer / Wise (0% fee)'}
                    </p>
                    
                    {/* Payment Details Box */}
                    <div className="rounded-md bg-muted p-4 mt-2">
                      <PaymentDetails paymentMethod={selectedInvoice.paymentMethod} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
              {selectedInvoice.status === 'pending' && (
                <Button
                  variant="default"
                  onClick={() => markAsPaidMutation.mutate(selectedInvoice.id)}
                  disabled={markAsPaidMutation.isPending}
                >
                  {markAsPaidMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Banknote className="mr-2 h-4 w-4" />
                      Mark as Paid
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
                    deleteInvoiceMutation.mutate(selectedInvoice.id);
                  }
                }}
                disabled={deleteInvoiceMutation.isPending}
              >
                {deleteInvoiceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function UserInvoicesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined });
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Function to get country name from country code
  const getCountryName = (countryCode: string) => {
    const country = countries.find(c => 
      typeof c === 'object' && c.value === countryCode
    );
    return country ? country.label : countryCode;
  };
  
  // Fetch user's invoices
  useEffect(() => {
    if (!user) return;
    
    setIsLoading(true);
    fetch("/api/invoices", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch invoices: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setInvoices(data);
        } else {
          console.error("Expected array of invoices but got:", data);
          setInvoices([]);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching invoices:", error);
        toast({
          title: "Error",
          description: "Failed to load invoices",
          variant: "destructive",
        });
        setInvoices([]);
        setIsLoading(false);
      });
  }, [user, toast]);
  
  // Apply filters
  const filteredInvoices = invoices
    .filter(invoice => {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const invoiceId = invoice.id.toString();
        const notes = invoice.notes?.toLowerCase() || '';
        
        return invoiceId.includes(query) || notes.includes(query);
      }
      return true;
    })
    .filter(invoice => {
      // Apply date filter
      if (dateRange.from) {
        const invoiceDate = new Date(invoice.createdAt);
        if (dateRange.to) {
          return invoiceDate >= dateRange.from && invoiceDate <= dateRange.to;
        }
        return invoiceDate >= dateRange.from;
      }
      return true;
    })
    .filter(invoice => {
      // Apply status filter
      if (statusFilter && statusFilter !== "all") {
        return invoice.status === statusFilter;
      }
      return true;
    });
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DatePickerWithRange
            date={dateRange}
            setDate={setDateRange}
          />
          
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Invoices Table */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-10 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">No Invoices Found</h3>
          <p className="text-muted-foreground">
            {searchQuery || dateRange.from || statusFilter
              ? "Try adjusting your search or filters"
              : "You don't have any invoices yet"}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice: Invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>#{invoice.id}</TableCell>
                  <TableCell>
                    {invoice.notes 
                      ? (invoice.notes.length > 50 ? `${invoice.notes.substring(0, 50)}...` : invoice.notes)
                      : "Link Building Services"}
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.amount / 100)}</TableCell>
                  <TableCell>{format(new Date(invoice.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                    {new Date(invoice.dueDate) < new Date() && invoice.status === 'pending' && (
                      <Badge variant="destructive" className="ml-2">
                        Overdue
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.status === 'paid' ? 'outline' :
                        invoice.status === 'overdue' ? 'destructive' : 'default'
                      }
                    >
                      {invoice.status === 'paid' ? (
                        <span className="flex items-center">
                          <Check className="mr-1 h-3 w-3" />
                          Paid
                        </span>
                      ) : invoice.status === 'overdue' ? (
                        <span className="flex items-center">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Overdue
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <FileText className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Invoice details dialog */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Invoice #{selectedInvoice.id}</DialogTitle>
              <DialogDescription>
                {selectedInvoice.status === 'paid' 
                  ? `Paid on ${selectedInvoice.paidAt ? format(new Date(selectedInvoice.paidAt), 'MMMM d, yyyy') : 'Unknown date'}`
                  : `Due on ${format(new Date(selectedInvoice.dueDate), 'MMMM d, yyyy')}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-semibold">From</h3>
                  <p>Digital Gratified FZ-LLC</p>
                  <p>Dubai Silicon Oasis</p>
                  <p>United Arab Emirates</p>
                </div>
                <div className="text-right">
                  <h3 className="font-semibold">To</h3>
                  <p>{user?.companyName || user?.username}</p>
                  <p>{selectedInvoice.clientEmail || user?.email}</p>
                  <p>{user?.country ? getCountryName(user.country) : ""}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="whitespace-pre-line">
                          {selectedInvoice.notes || "Link Building Services"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(selectedInvoice.amount / 100)}
                        </TableCell>
                      </TableRow>
                      {selectedInvoice.paymentFee ? (
                        <TableRow>
                          <TableCell>PayPal Service Fee (5%)</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(selectedInvoice.paymentFee)}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <Badge 
                    variant={
                      selectedInvoice.status === 'paid' ? 'outline' :
                      selectedInvoice.status === 'overdue' ? 'destructive' : 'default'
                    }
                    className="text-base py-1 px-3"
                  >
                    {selectedInvoice.status === 'paid' ? (
                      <span className="flex items-center">
                        <Check className="mr-1 h-4 w-4" />
                        Paid
                      </span>
                    ) : selectedInvoice.status === 'overdue' ? (
                      <span className="flex items-center">
                        <AlertTriangle className="mr-1 h-4 w-4" />
                        Overdue
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        Pending
                      </span>
                    )}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(selectedInvoice.amount / 100)}
                  </p>
                </div>
              </div>
              
              {/* Payment Method Information */}
              {selectedInvoice.paymentMethod && (
                <div className="pt-2">
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Payment Method</h3>
                    <p className="mb-2">
                      {selectedInvoice.paymentMethod === 'paypal' 
                        ? 'PayPal (5% fee)' 
                        : 'Wire Transfer / Wise (0% fee)'}
                    </p>
                    
                    {/* Payment Details Box */}
                    <div className="rounded-md bg-muted p-4 mt-2">
                      <PaymentDetails paymentMethod={selectedInvoice.paymentMethod} />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Download Invoice Button (if file is available) */}
              {selectedInvoice.fileUrl && (
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" asChild>
                    <a href={selectedInvoice.fileUrl} target="_blank" rel="noopener noreferrer" download>
                      <Download className="mr-2 h-4 w-4" />
                      Download Invoice PDF
                    </a>
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
              {selectedInvoice.status === 'pending' && selectedInvoice.paymentMethod && (
                <Button variant="default" asChild>
                  {selectedInvoice.paymentMethod === 'paypal' ? (
                    <a href="https://paypal.me/vibhu216" target="_blank" rel="noopener noreferrer">
                      <Banknote className="mr-2 h-4 w-4" />
                      Pay Now
                    </a>
                  ) : (
                    <a
                      href={`mailto:payments@digitalgratified.com?subject=Invoice %23${selectedInvoice.id} Payment Confirmation&body=Hello,%0A%0AI have completed the wire transfer for Invoice %23${selectedInvoice.id} for the amount of ${formatCurrency(selectedInvoice.amount / 100)}.%0A%0APlease confirm receipt.%0A%0AThank you.`}
                    >
                      <Banknote className="mr-2 h-4 w-4" />
                      Notify Payment
                    </a>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }
  
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            {user?.is_admin 
              ? "Manage all client invoices and payments" 
              : "View and manage your invoice history"}
          </p>
        </div>
        
        <Tabs defaultValue={user?.is_admin ? "admin" : "client"}>
          {user?.is_admin && (
            <TabsList>
              <TabsTrigger value="admin">All Invoices</TabsTrigger>
            </TabsList>
          )}
          
          <TabsContent value="admin" className="space-y-4">
            <AdminInvoicesTab />
          </TabsContent>
          
          <TabsContent value="client" className="space-y-4">
            <UserInvoicesTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}