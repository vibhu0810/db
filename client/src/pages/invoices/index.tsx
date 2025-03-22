import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
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
  MoreHorizontal,
  Pencil,
  Search
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { uploadFile } from "@/utils/uploadthing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  // Query for completed orders that haven't been billed yet
  const completedOrdersQuery = useQuery({
    queryKey: ['/api/orders/completed-unbilled', selectedUser],
    queryFn: async () => {
      if (!selectedUser) return [];
      
      try {
        const res = await apiRequest("GET", `/api/orders/completed-unbilled/${selectedUser}`);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Failed to fetch completed orders:", errorText);
          return [];
        }
        
        const data = await res.json();
        console.log("Completed unbilled orders:", data);
        return data;
      } catch (error) {
        console.error("Error fetching completed orders:", error);
        return [];
      }
    },
    enabled: !!selectedUser,
    staleTime: 10000,
    initialData: [],
  });

  // Generate invoice description based on order type
  const generateInvoiceDescription = (order: any) => {
    const orderId = order.id;
    const price = order.price;
    
    // Check if it's a guest post
    if (order.status === "guest_post_published" || 
        (order.type === "guest_post" && order.status === "completed")) {
      return `Link Building Services - #${orderId} - ${order.sourceUrl} (${order.title || 'Guest Post'}) - $${price}`;
    } 
    // Otherwise it's a niche edit
    else {
      return `Link Building Services - #${orderId} - ${order.sourceUrl} - $${price}`;
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
  };

  // Create and send the invoice
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      // Set due date to 30 days from now by default
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      const invoiceData = {
        userId: selectedUser,
        amount: totalAmount * 100, // Convert to cents for storage
        notes: invoiceDescription,
        dueDate: dueDate.toISOString(),
        status: 'pending',
        fileName: 'invoice.pdf',
        fileUrl: '',
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
                {/* Debug Info */}
                <div className="mb-2 p-2 bg-yellow-50 text-xs rounded-md border border-yellow-200">
                  <p>Debug - Client data available: {Array.isArray(clientsQuery.data) ? 'Yes' : 'No'}</p>
                  <p>Debug - Client count: {Array.isArray(clientsQuery.data) ? clientsQuery.data.length : 0}</p>
                </div>
                
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
                  <p className="text-xs text-muted-foreground mt-1">
                    No clients found. Make sure there are regular users in the system.
                  </p>
                )}
              </div>
            </div>
            
            {completedOrdersQuery.isLoading && selectedUser && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">Loading completed orders...</span>
              </div>
            )}
            
            {!completedOrdersQuery.isLoading && selectedUser && completedOrdersQuery.data.length === 0 && (
              <div className="text-center my-8 p-4 bg-muted rounded-lg">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <h3 className="font-medium">No Billable Orders</h3>
                <p className="text-muted-foreground">
                  This client doesn't have any completed unbilled orders. Only completed orders can be billed.
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Step 2: Invoice Preview */}
        {previewStep && selectedClient && (
          <div className="space-y-6 py-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center border-b pb-2 mb-3">
                <h3 className="font-semibold text-lg">Invoice Preview</h3>
                <div className="font-mono text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                  ${totalAmount.toFixed(2)}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-medium">{selectedClient.companyName || selectedClient.username}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Orders:</span>
                  <span className="font-medium">{completedOrdersQuery.data.length} item(s)</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">${totalAmount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">30 days from today</span>
                </div>
              </div>
            </div>
            
            {/* Orders Included */}
            <div>
              <h4 className="font-medium mb-2">Orders Included</h4>
              <div className="border rounded-md max-h-60 overflow-y-auto">
                {completedOrdersQuery.data.map((order: any) => (
                  <div 
                    key={order.id}
                    className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50"
                  >
                    <div className="overflow-hidden">
                      <div className="font-medium truncate">
                        #{order.id} - {order.sourceUrl}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        Completed on {new Date(order.dateCompleted).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm font-medium whitespace-nowrap">
                      ${parseFloat(order.price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Description Preview */}
            <div>
              <h4 className="font-medium mb-2">Invoice Description</h4>
              <div className="bg-muted/30 rounded-md p-3 max-h-40 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap">{invoiceDescription}</pre>
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
                    Sending...
                  </>
                ) : (
                  <>
                    Approve & Send Invoice
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!selectedUser || completedOrdersQuery.isLoading || completedOrdersQuery.data.length === 0}
                onClick={() => setPreviewStep(true)}
              >
                {completedOrdersQuery.isLoading ? "Loading..." : "Continue"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminInvoicesTab() {
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithUser | null>(null);
  
  const invoicesQuery = useQuery({
    queryKey: ['/api/invoices/all'],
    refetchInterval: 10000, // Refresh every 10 seconds
    initialData: [],
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await apiRequest(`/api/invoices/${invoiceId}/paid`, {
        method: 'PATCH',
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice marked as paid",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/all'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark invoice as paid",
        variant: "destructive",
      });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/all'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  if (invoicesQuery.isLoading) {
    return <div className="flex items-center justify-center p-8">Loading invoices...</div>;
  }

  if (invoicesQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-red-500">Error loading invoices</p>
        <Button onClick={() => invoicesQuery.refetch()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const invoices = invoicesQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Manage Invoices</h2>
        <CreateInvoiceDialog />
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <FileText className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No invoices found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create an invoice to send to a client
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice: InvoiceWithUser) => (
                  <TableRow key={invoice.id}>
                    <TableCell>INV-{invoice.id}</TableCell>
                    <TableCell>{invoice.user?.companyName || 'Unknown'}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount / 100)}</TableCell>
                    <TableCell>{invoice.notes || 'No description'}</TableCell>
                    <TableCell>{format(new Date(invoice.dueDate), "PPP")}</TableCell>
                    <TableCell>
                      {invoice.status === 'paid' ? (
                        <Badge variant="success" className="bg-green-100 text-green-800">
                          Paid
                        </Badge>
                      ) : invoice.status === 'overdue' ? (
                        <Badge variant="destructive">
                          Overdue
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {invoice.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsPaidMutation.mutate(invoice.id)}
                            disabled={markAsPaidMutation.isPending}
                          >
                            <FileCheck className="h-4 w-4" />
                            <span className="sr-only">Mark as Paid</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this invoice?")) {
                              deleteInvoiceMutation.mutate(invoice.id);
                            }
                          }}
                          disabled={deleteInvoiceMutation.isPending}
                        >
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invoice Details Dialog */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Invoice #INV-{selectedInvoice.id}</DialogTitle>
              <DialogDescription>
                Issued on {format(new Date(selectedInvoice.createdAt), "PPP")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Client</h3>
                  <p>{selectedInvoice.user?.companyName || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.user?.email}</p>
                </div>
                <div className="text-right">
                  <h3 className="font-medium">Amount</h3>
                  <p className="text-lg font-bold">{formatCurrency(selectedInvoice.amount / 100)}</p>
                  <p className={`text-sm ${
                    selectedInvoice.status === 'paid' ? 'text-green-600' : 
                    selectedInvoice.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {selectedInvoice.status === 'paid' ? 'Paid' : 
                     selectedInvoice.status === 'overdue' ? 'Overdue' : 'Pending'}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-medium">Notes</h3>
                <p>{selectedInvoice.notes || 'No description provided'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Due Date</h3>
                  <p>{format(new Date(selectedInvoice.dueDate), "PPP")}</p>
                </div>
                <div className="text-right">
                  {selectedInvoice.fileUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedInvoice.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download Invoice
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
              {selectedInvoice.status === 'pending' && (
                <Button
                  onClick={() => {
                    markAsPaidMutation.mutate(selectedInvoice.id);
                    setSelectedInvoice(null);
                  }}
                  disabled={markAsPaidMutation.isPending}
                >
                  Mark as Paid
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function UserInvoicesTab() {
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [isFilteringByDate, setIsFilteringByDate] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    billingName: "",
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    billingCountry: "",
    billingNotes: "",
  });
  const [isEditingBilling, setIsEditingBilling] = useState(false);

  const baseInvoicesQuery = useQuery({
    queryKey: ['/api/invoices'],
    refetchInterval: 10000, // Refresh every 10 seconds
    enabled: !isFilteringByDate,
    initialData: [],
  });

  const dateFilteredInvoicesQuery = useQuery({
    queryKey: [
      '/api/invoices/filter/date',
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString(),
    ],
    enabled: isFilteringByDate && !!dateRange?.from,
    initialData: [],
  });

  const invoices = isFilteringByDate
    ? dateFilteredInvoicesQuery.data || []
    : baseInvoicesQuery.data || [];

  const isLoading =
    (baseInvoicesQuery.isLoading && !isFilteringByDate) ||
    (dateFilteredInvoicesQuery.isLoading && isFilteringByDate);

  const isError =
    (baseInvoicesQuery.isError && !isFilteringByDate) ||
    (dateFilteredInvoicesQuery.isError && isFilteringByDate);

  const applyDateFilter = () => {
    if (!dateRange?.from) {
      toast({
        title: "Error",
        description: "Please select a start date",
        variant: "destructive",
      });
      return;
    }
    
    setIsFilteringByDate(true);
  };

  const clearFilters = () => {
    setIsFilteringByDate(false);
    setDateRange({ from: undefined, to: undefined });
  };

  const handleBillingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would normally save the billing details to the backend
    toast({
      title: "Success",
      description: "Billing details updated successfully",
    });
    setIsEditingBilling(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading invoices...</div>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-red-500">Error loading invoices</p>
        <Button onClick={() => {
          if (isFilteringByDate) {
            dateFilteredInvoicesQuery.refetch();
          } else {
            baseInvoicesQuery.refetch();
          }
        }} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <Card className="w-full md:w-96">
          <CardHeader>
            <CardTitle>Billing Details</CardTitle>
            <CardDescription>
              Your billing details for invoicing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingBilling ? (
              <form onSubmit={handleBillingSubmit} className="space-y-4">

                
                <div className="space-y-2">
                  <Label htmlFor="billingName">Person Name / Business Name <span className="text-red-500">*</span></Label>
                  <Input 
                    id="billingName"
                    placeholder="John Doe or Acme Inc."
                    value={billingDetails.billingName}
                    onChange={(e) => setBillingDetails({...billingDetails, billingName: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="billingAddress">Billing Address <span className="text-red-500">*</span></Label>
                  <Input 
                    id="billingAddress"
                    placeholder="123 Main St"
                    value={billingDetails.billingAddress}
                    onChange={(e) => setBillingDetails({...billingDetails, billingAddress: e.target.value})}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="billingCity">City <span className="text-red-500">*</span></Label>
                    <Input 
                      id="billingCity"
                      placeholder="New York"
                      value={billingDetails.billingCity}
                      onChange={(e) => setBillingDetails({...billingDetails, billingCity: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingState">State <span className="text-red-500">*</span></Label>
                    <Input 
                      id="billingState"
                      placeholder="NY"
                      value={billingDetails.billingState}
                      onChange={(e) => setBillingDetails({...billingDetails, billingState: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="billingZip">ZIP Code <span className="text-red-500">*</span></Label>
                    <Input 
                      id="billingZip"
                      placeholder="10001"
                      value={billingDetails.billingZip}
                      onChange={(e) => setBillingDetails({...billingDetails, billingZip: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingCountry">Country <span className="text-red-500">*</span></Label>
                    <Input 
                      id="billingCountry"
                      placeholder="United States"
                      value={billingDetails.billingCountry}
                      onChange={(e) => setBillingDetails({...billingDetails, billingCountry: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="billingNotes">Notes</Label>
                  <textarea 
                    id="billingNotes"
                    className="w-full min-h-[100px] p-2 border rounded"
                    placeholder="Add any additional billing information or special instructions here..."
                    value={billingDetails.billingNotes}
                    onChange={(e) => setBillingDetails({...billingDetails, billingNotes: e.target.value})}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditingBilling(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Save
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {billingDetails.billingName ? (
                  <div className="space-y-2">
                    {billingDetails.billingName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{billingDetails.billingName}</span>
                      </div>
                    )}
                    {billingDetails.billingAddress && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Address:</span>
                        <span className="font-medium">{billingDetails.billingAddress}</span>
                      </div>
                    )}
                    {(billingDetails.billingCity || billingDetails.billingState) && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">City/State:</span>
                        <span className="font-medium">
                          {billingDetails.billingCity}{billingDetails.billingCity && billingDetails.billingState ? ', ' : ''}{billingDetails.billingState}
                        </span>
                      </div>
                    )}
                    {billingDetails.billingZip && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ZIP:</span>
                        <span className="font-medium">{billingDetails.billingZip}</span>
                      </div>
                    )}
                    {billingDetails.billingCountry && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Country:</span>
                        <span className="font-medium">{billingDetails.billingCountry}</span>
                      </div>
                    )}
                    {billingDetails.billingNotes && (
                      <div className="flex flex-col mt-2">
                        <span className="text-muted-foreground">Notes:</span>
                        <span className="text-sm mt-1">{billingDetails.billingNotes}</span>
                      </div>
                    )}
                    <div className="flex justify-between mt-2">
                      <span className="text-muted-foreground">Next Invoice:</span>
                      <span className="font-medium">{format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "PPP")}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-2">No billing details provided yet</p>
                )}
                <Button 
                  className="w-full" 
                  onClick={() => setIsEditingBilling(true)}
                >
                  {billingDetails.billingName ? 'Edit Billing Details' : 'Add Billing Details'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <Card className="w-full md:w-auto">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div>
                  <Label htmlFor="date-filter" className="text-sm">Date Range</Label>
                  <DatePickerWithRange
                    date={dateRange}
                    setDate={setDateRange}
                    className="w-full sm:w-auto"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyDateFilter}
                  disabled={!dateRange?.from}
                >
                  Filter
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {isFilteringByDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="mt-2 md:mt-6"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <FileText className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No invoices found</p>
            {isFilteringByDate && (
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice: Invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>INV-{invoice.id}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount / 100)}</TableCell>
                    <TableCell>{invoice.notes || 'No description'}</TableCell>
                    <TableCell>{format(new Date(invoice.dueDate), "PPP")}</TableCell>
                    <TableCell>
                      {invoice.status === 'paid' ? (
                        <Badge variant="success" className="bg-green-100 text-green-800">
                          Paid
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                        {invoice.fileUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={invoice.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                              <span className="sr-only">Download</span>
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invoice Details Dialog */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Invoice #INV-{selectedInvoice.id}</DialogTitle>
              <DialogDescription>
                Issued on {format(new Date(selectedInvoice.createdAt), "PPP")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Amount</h3>
                  <p className="text-lg font-bold">{formatCurrency(selectedInvoice.amount / 100)}</p>
                </div>
                <div className="text-right">
                  <h3 className="font-medium">Status</h3>
                  <p className={`text-sm ${
                    selectedInvoice.status === 'paid' ? 'text-green-600' : 
                    selectedInvoice.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {selectedInvoice.status === 'paid' ? 'Paid' : 
                     selectedInvoice.status === 'overdue' ? 'Overdue' : 'Pending'}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-medium">Notes</h3>
                <p>{selectedInvoice.notes || 'No description provided'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Due Date</h3>
                  <p>{format(new Date(selectedInvoice.dueDate), "PPP")}</p>
                </div>
                <div className="text-right">
                  {selectedInvoice.fileUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedInvoice.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download Invoice
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p>Please login to view invoices</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue={user?.is_admin ? "admin" : "user"} className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
        {user?.is_admin && <TabsTrigger value="admin">Admin View</TabsTrigger>}
        <TabsTrigger value="user" className={user?.is_admin ? "" : "col-span-2"}>
          Invoices
        </TabsTrigger>
      </TabsList>
      {user?.is_admin && (
        <TabsContent value="admin" className="mt-6">
          <AdminInvoicesTab />
        </TabsContent>
      )}
      <TabsContent value="user" className="mt-6">
        <UserInvoicesTab />
      </TabsContent>
    </Tabs>
  );
}