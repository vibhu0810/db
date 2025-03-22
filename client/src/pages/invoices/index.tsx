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
  from?: Date;
  to?: Date;
}

interface Invoice {
  id: number;
  userId: number;
  amount: number;
  description: string;
  dueDate: string;
  isPaid: boolean;
  invoiceNumber: string;
  createdAt: string;
  fileUrl: string | null;
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
      amount: parseFloat(amount),
      description,
      dueDate: new Date(dueDate).toISOString(),
      isPaid: false,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      fileUrl,
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
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest(`/api/invoices/${invoiceId}/paid`, {
        method: 'PATCH',
      });
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
      return apiRequest(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
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
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.user?.companyName || 'Unknown'}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell>{format(new Date(invoice.dueDate), "PPP")}</TableCell>
                    <TableCell>
                      {invoice.isPaid ? (
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
                        {!invoice.isPaid && (
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
              <DialogTitle>Invoice #{selectedInvoice.invoiceNumber}</DialogTitle>
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
                  <p className="text-lg font-bold">{formatCurrency(selectedInvoice.amount)}</p>
                  <p className={`text-sm ${selectedInvoice.isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                    {selectedInvoice.isPaid ? 'Paid' : 'Pending'}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-medium">Description</h3>
                <p>{selectedInvoice.description}</p>
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
              {!selectedInvoice.isPaid && (
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
  const [amountFilter, setAmountFilter] = useState({
    min: "",
    max: "",
  });
  const [isFilteringByDate, setIsFilteringByDate] = useState(false);
  const [isFilteringByAmount, setIsFilteringByAmount] = useState(false);

  const baseInvoicesQuery = useQuery({
    queryKey: ['/api/invoices'],
    refetchInterval: 10000, // Refresh every 10 seconds
    enabled: !isFilteringByDate && !isFilteringByAmount,
  });

  const dateFilteredInvoicesQuery = useQuery({
    queryKey: [
      '/api/invoices/filter/date',
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString(),
    ],
    enabled: isFilteringByDate && !!dateRange?.from,
  });

  const amountFilteredInvoicesQuery = useQuery({
    queryKey: [
      '/api/invoices/filter/amount',
      amountFilter.min,
      amountFilter.max,
    ],
    enabled: isFilteringByAmount && (!!amountFilter.min || !!amountFilter.max),
  });

  const invoices = isFilteringByDate
    ? dateFilteredInvoicesQuery.data || []
    : isFilteringByAmount
    ? amountFilteredInvoicesQuery.data || []
    : baseInvoicesQuery.data || [];

  const isLoading =
    (baseInvoicesQuery.isLoading && !isFilteringByDate && !isFilteringByAmount) ||
    (dateFilteredInvoicesQuery.isLoading && isFilteringByDate) ||
    (amountFilteredInvoicesQuery.isLoading && isFilteringByAmount);

  const isError =
    (baseInvoicesQuery.isError && !isFilteringByDate && !isFilteringByAmount) ||
    (dateFilteredInvoicesQuery.isError && isFilteringByDate) ||
    (amountFilteredInvoicesQuery.isError && isFilteringByAmount);

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
    setIsFilteringByAmount(false);
  };

  const applyAmountFilter = () => {
    if (!amountFilter.min && !amountFilter.max) {
      toast({
        title: "Error",
        description: "Please enter at least one amount value",
        variant: "destructive",
      });
      return;
    }
    
    setIsFilteringByAmount(true);
    setIsFilteringByDate(false);
  };

  const clearFilters = () => {
    setIsFilteringByDate(false);
    setIsFilteringByAmount(false);
    setDateRange({ from: undefined, to: undefined });
    setAmountFilter({ min: "", max: "" });
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
          } else if (isFilteringByAmount) {
            amountFilteredInvoicesQuery.refetch();
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">My Invoices</h2>
        
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
          
          <Card className="w-full md:w-auto">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div>
                  <Label htmlFor="min-amount" className="text-sm">Min Amount</Label>
                  <Input
                    id="min-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={amountFilter.min}
                    onChange={(e) => setAmountFilter(prev => ({ ...prev, min: e.target.value }))}
                    className="w-full sm:w-28"
                  />
                </div>
                <div>
                  <Label htmlFor="max-amount" className="text-sm">Max Amount</Label>
                  <Input
                    id="max-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Max"
                    value={amountFilter.max}
                    onChange={(e) => setAmountFilter(prev => ({ ...prev, max: e.target.value }))}
                    className="w-full sm:w-28"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyAmountFilter}
                  disabled={!amountFilter.min && !amountFilter.max}
                >
                  Filter
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {(isFilteringByDate || isFilteringByAmount) && (
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
            {(isFilteringByDate || isFilteringByAmount) && (
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
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell>{format(new Date(invoice.dueDate), "PPP")}</TableCell>
                    <TableCell>
                      {invoice.isPaid ? (
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
              <DialogTitle>Invoice #{selectedInvoice.invoiceNumber}</DialogTitle>
              <DialogDescription>
                Issued on {format(new Date(selectedInvoice.createdAt), "PPP")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Amount</h3>
                  <p className="text-lg font-bold">{formatCurrency(selectedInvoice.amount)}</p>
                </div>
                <div className="text-right">
                  <h3 className="font-medium">Status</h3>
                  <p className={`text-sm ${selectedInvoice.isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                    {selectedInvoice.isPaid ? 'Paid' : 'Pending'}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-medium">Description</h3>
                <p>{selectedInvoice.description}</p>
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

  return (
    <DashboardShell>
      <Tabs defaultValue={user?.is_admin ? "admin" : "user"} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          {user?.is_admin && <TabsTrigger value="admin">Admin View</TabsTrigger>}
          <TabsTrigger value="user" className={user?.is_admin ? "" : "col-span-2"}>
            My Invoices
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
    </DashboardShell>
  );
}