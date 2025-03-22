import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Trash, Upload, FileText, Filter, FileCheck, FileX, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { uploadFile } from "@/utils/uploadthing";

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
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user?.is_admin,
    initialData: [],
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploading(true);
    
    try {
      const response = await uploadFile(file, 'invoice');
      setFileUrl(response);
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice created successfully",
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

  const resetForm = () => {
    setSelectedUser(null);
    setAmount("");
    setDescription("");
    setDueDate("");
    setFileUrl(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !amount || !description || !dueDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const invoiceData = {
      userId: selectedUser,
      amount: parseFloat(amount) * 100, // Convert to cents for storage
      notes: description,
      dueDate: new Date(dueDate).toISOString(),
      status: 'pending',
      fileName: fileUrl ? fileUrl.split('/').pop() || 'invoice.pdf' : 'invoice.pdf',
      fileUrl: fileUrl || '',
    };

    createInvoiceMutation.mutate(invoiceData);
  };

  if (!user?.is_admin) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="ml-auto">
          <Upload className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Create an invoice to send to a client. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right">
                Client
              </Label>
              <div className="col-span-3">
                <select
                  id="client"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedUser || ""}
                  onChange={(e) => setSelectedUser(Number(e.target.value))}
                  required
                >
                  <option value="">Select a client</option>
                  {usersQuery.data?.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.companyName || user.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount (USD)
              </Label>
              <div className="col-span-3">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <div className="col-span-3">
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Invoice description"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Due Date
              </Label>
              <div className="col-span-3">
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="file" className="text-right">
                Attachment
              </Label>
              <div className="col-span-3">
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
                {fileUrl && <p className="text-sm text-muted-foreground mt-1">File uploaded successfully</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoiceMutation.isPending || uploading}>
              {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
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