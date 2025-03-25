import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, 
  Loader2, 
  ChevronDown, 
  Copy, 
  Plus, 
  Edit, 
  Download, 
  Trash2,
  Trash,
  Upload,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Resizable } from "react-resizable";
import 'react-resizable/css/styles.css';
// Import the Button type to extend the PaginationLink component
import type { ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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

// Extend the PaginationLink component to accept the disabled property
interface ExtendedPaginationLinkProps extends React.ComponentPropsWithoutRef<typeof PaginationLink> {
  disabled?: boolean;
}

// Re-export the PaginationLink component with the extended props
const ExtendedPaginationPrevious = ({ disabled, ...props }: ExtendedPaginationLinkProps) => (
  <PaginationPrevious className={disabled ? 'pointer-events-none opacity-50' : ''} {...props} />
);

const ExtendedPaginationNext = ({ disabled, ...props }: ExtendedPaginationLinkProps) => (
  <PaginationNext className={disabled ? 'pointer-events-none opacity-50' : ''} {...props} />
);

interface Domain {
  id: number;
  websiteName: string;
  websiteUrl: string;
  domainRating: string;
  websiteTraffic: number;
  niche: string;
  type: "guest_post" | "niche_edit" | "both";
  guidelines: string | null;
  guestPostPrice?: string | null;
  nicheEditPrice?: string | null;
  lastMetricsUpdate?: Date | null;
}

function getGuestPostTAT(domain: Domain): string {
  if (domain.websiteUrl === "engagebay.com") {
    return "3 working days";
  } else if (domain.websiteUrl === "blog.powr.io") {
    return "10 working days post content approval";
  }
  return "7-14 business days";
}

function getNicheEditTAT(domain: Domain): string {
  if (domain.websiteUrl === "engagebay.com") {
    return "3 working days";
  } else if (domain.websiteUrl === "blog.powr.io") {
    return "3 working days";
  }
  return "5-7 business days";
}

// Define schema for domain form
const domainFormSchema = z.object({
  websiteName: z.string().optional().default(""),
  websiteUrl: z.string().min(3, "Website URL is required"),
  domainRating: z.string().optional(),
  websiteTraffic: z.coerce.number().min(0, "Traffic must be a positive number").optional(),
  niche: z.string().optional().default(""),
  type: z.enum(["guest_post", "niche_edit", "both"]),
  guestPostPrice: z.string().optional(),
  nicheEditPrice: z.string().optional(),
  guidelines: z.string().optional(),
});

type DomainFormValues = z.infer<typeof domainFormSchema>;

export default function DomainsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "guest_post" | "niche_edit" | "both">("all");
  const [drRange, setDrRange] = useState("all");
  const [trafficRange, setTrafficRange] = useState("all");
  const [sortField, setSortField] = useState<string>("websiteUrl");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAddDomainSheet, setShowAddDomainSheet] = useState(false);
  const [domainToEdit, setDomainToEdit] = useState<Domain | null>(null);
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importError, setImportError] = useState("");
  const [importInProgress, setImportInProgress] = useState(false);
  const queryClient = useQueryClient();
  
  // Column width states - optimized for better screen fit
  const [columnWidths, setColumnWidths] = useState({
    website: 200,
    dr: 80,
    traffic: 100,
    type: 80,
    guestPostPrice: 110,
    nicheEditPrice: 110,
    guestPostTat: 120,
    nicheEditTat: 120,
    guidelines: 180,
    action: 100,
  });

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['/api/domains'],
    queryFn: () => apiRequest("GET", "/api/domains").then(res => res.json()),
  });

  const { isAdmin } = useAuth();
  
  // Create a new domain (admin only)
  const addDomainMutation = useMutation({
    mutationFn: async (data: DomainFormValues) => {
      setIsActionInProgress(true);
      const res = await apiRequest("POST", "/api/domains", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create domain");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains'] });
      setShowAddDomainSheet(false);
      setIsActionInProgress(false);
      toast({
        title: "Domain added",
        description: "The domain has been added successfully."
      });
    },
    onError: (error: Error) => {
      setIsActionInProgress(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Update an existing domain (admin only)
  const updateDomainMutation = useMutation({
    mutationFn: async (data: DomainFormValues & { id: number }) => {
      setIsActionInProgress(true);
      const { id, ...updateData } = data;
      const res = await apiRequest("PUT", `/api/domains/${id}`, updateData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update domain");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains'] });
      setDomainToEdit(null);
      setIsActionInProgress(false);
      toast({
        title: "Domain updated",
        description: "The domain has been updated successfully."
      });
    },
    onError: (error: Error) => {
      setIsActionInProgress(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Delete a domain (admin only)
  const deleteDomainMutation = useMutation({
    mutationFn: async (id: number) => {
      setIsActionInProgress(true);
      const res = await apiRequest("DELETE", `/api/domains/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete domain");
      }
      
      // Try to parse JSON response, but don't fail if it's not valid JSON
      try {
        return res.json();
      } catch (e) {
        // If the response is not valid JSON (like "OK"), just return a success object
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains'] });
      setDomainToDelete(null);
      setIsActionInProgress(false);
      toast({
        title: "Domain deleted",
        description: "The domain has been deleted successfully."
      });
    },
    onError: (error: Error) => {
      setIsActionInProgress(false);
      setDomainToDelete(null);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Function to export domains as CSV
  // Import domains mutation
  const importDomainsMutation = useMutation({
    mutationFn: async (domains: any[]) => {
      setImportInProgress(true);
      const res = await apiRequest("POST", "/api/domains/import", { domains });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to import domains");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains'] });
      setImportInProgress(false);
      setImportFile(null);
      setImportPreview([]);
      setImportError("");
      toast({
        title: "Import successful",
        description: `${data.imported} domains have been imported successfully.`
      });
    },
    onError: (error: Error) => {
      setImportInProgress(false);
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Process CSV file for import
  const handleImportPreview = async () => {
    if (!importFile) return;
    setImportInProgress(true);
    setImportError("");

    try {
      const text = await importFile.text();
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        setImportError("CSV file is empty");
        setImportInProgress(false);
        return;
      }

      // Parse headers (first line)
      const headers = lines[0].split(',').map(header => header.trim());
      
      // Required fields check
      const requiredFields = ['Website URL', 'Type'];
      const missingFields = requiredFields.filter(field => 
        !headers.some(header => header.toLowerCase() === field.toLowerCase())
      );
      
      if (missingFields.length > 0) {
        setImportError(`Missing required fields: ${missingFields.join(', ')}`);
        setImportInProgress(false);
        return;
      }

      // Parse data rows
      const domains = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim());
        if (values.length !== headers.length) continue;
        
        const domain: any = {};
        headers.forEach((header, index) => {
          const value = values[index];
          
          switch (header.toLowerCase()) {
            case 'website name':
              domain.websiteName = value;
              break;
            case 'website url':
              domain.websiteUrl = value;
              break;
            case 'domain rating':
            case 'dr':
              domain.domainRating = value;
              break;
            case 'traffic':
            case 'website traffic':
              domain.websiteTraffic = parseInt(value) || 0;
              break;
            case 'niche':
              domain.niche = value;
              break;
            case 'type':
              domain.type = value.toLowerCase() === 'guest post' ? 'guest_post' : 
                           value.toLowerCase() === 'niche edit' ? 'niche_edit' : 
                           value.toLowerCase() === 'both' ? 'both' : 'both';
              break;
            case 'guest post price':
              domain.guestPostPrice = value;
              break;
            case 'niche edit price':
              domain.nicheEditPrice = value;
              break;
            case 'guidelines':
              domain.guidelines = value;
              break;
          }
        });
        
        // Validate the domain
        if (!domain.websiteUrl) continue;
        
        // Fix any missing fields with defaults
        if (!domain.websiteName) domain.websiteName = domain.websiteUrl;
        if (!domain.type) domain.type = 'both';
        
        domains.push(domain);
      }
      
      if (domains.length === 0) {
        setImportError("No valid domains found in CSV");
        setImportInProgress(false);
        return;
      }

      // If preview is empty, set the preview
      if (importPreview.length === 0) {
        setImportPreview(domains);
        setImportInProgress(false);
      } else {
        // If preview exists, proceed with actual import
        importDomainsMutation.mutate(domains);
      }
    } catch (error) {
      console.error("Error parsing CSV:", error);
      setImportError("Error parsing CSV file");
      setImportInProgress(false);
    }
  };

  // Import domains from selected file
  const handleImportDomains = () => {
    if (importPreview.length > 0) {
      importDomainsMutation.mutate(importPreview);
    }
  };

  // Export domains to CSV
  const exportDomainsAsCSV = () => {
    // Create CSV content
    const headers = ['Website Name', 'Website URL', 'Domain Rating', 'Traffic', 'Niche', 'Type', 'Guest Post Price', 'Niche Edit Price', 'Guidelines'];
    const csvContent = filteredDomains.map((domain: any) => {
      return [
        domain.websiteName || '',
        domain.websiteUrl || '',
        domain.domainRating || '',
        domain.websiteTraffic || '',
        domain.niche || '',
        domain.type || '',
        domain.guestPostPrice || '',
        domain.nicheEditPrice || '',
        domain.guidelines ? `"${domain.guidelines.replace(/"/g, '""')}"` : ''
      ].join(',');
    });
    
    // Combine headers and rows
    const csv = [headers.join(','), ...csvContent].join('\n');
    
    // Create and download the file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `domain-inventory-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export successful",
      description: "Domains exported to CSV file."
    });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard.",
    });
  };

  // Resizable column handler
  const onResize = (column: keyof typeof columnWidths) => (_e: React.SyntheticEvent, { size }: { size: { width: number } }) => {
    // Set a maximum column width to prevent excessive stretching
    const maxWidth = 500;
    const minWidth = 50; // Add a minimum width to prevent columns from disappearing
    const newWidth = Math.min(Math.max(size.width, minWidth), maxWidth);
    
    console.log(`Resizing column ${column} to ${newWidth}px`);
    
    setColumnWidths(prev => ({
      ...prev,
      [column]: newWidth
    }));
  };
  
  // Apply CSS for resizable columns
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      table {
        width: 100%;
        table-layout: fixed;
        font-size: 0.95rem;
      }
      
      th {
        position: relative;
        overflow: visible;
        padding: 0.5rem 0.75rem !important;
      }
      
      td {
        padding: 0.5rem 0.75rem !important;
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
      
      /* Optimize cell display */
      table td, table th {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredDomains = domains
    .filter((domain: Domain) => {
      const matchesType = typeFilter === "all" || domain.type === typeFilter;
      const matchesSearch = !searchQuery ||
        domain.websiteUrl.toLowerCase().includes(searchQuery.toLowerCase());

      const domainRating = Number(domain.domainRating) || 0;
      const matchesDR = drRange === "all" ||
        (drRange === "0-30" && domainRating <= 30) ||
        (drRange === "31-50" && domainRating > 30 && domainRating <= 50) ||
        (drRange === "51-70" && domainRating > 50 && domainRating <= 70) ||
        (drRange === "71+" && domainRating > 70);

      const traffic = Number(domain.websiteTraffic) || 0;
      const matchesTraffic = trafficRange === "all" ||
        (trafficRange === "0-5k" && traffic <= 5000) ||
        (trafficRange === "5k-20k" && traffic > 5000 && traffic <= 20000) ||
        (trafficRange === "20k-50k" && traffic > 20000 && traffic <= 50000) ||
        (trafficRange === "50k+" && traffic > 50000);

      return matchesType && matchesSearch && matchesDR && matchesTraffic;
    })
    .sort((a: Domain, b: Domain) => {
      let aValue = (a as any)[sortField];
      let bValue = (b as any)[sortField];
      
      // Handle sorting for price fields
      if (sortField === 'guestPostPrice' || sortField === 'nicheEditPrice') {
        // For Guest Post Price, exclude domains that don't offer that service
        if (sortField === 'guestPostPrice' && a.type === 'niche_edit') aValue = sortDirection === 'asc' ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
        if (sortField === 'guestPostPrice' && b.type === 'niche_edit') bValue = sortDirection === 'asc' ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
        
        // For Niche Edit Price, exclude domains that don't offer that service
        if (sortField === 'nicheEditPrice' && a.type === 'guest_post') aValue = sortDirection === 'asc' ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
        if (sortField === 'nicheEditPrice' && b.type === 'guest_post') bValue = sortDirection === 'asc' ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
        
        // Convert to numbers for comparison
        const aNum = aValue ? Number(aValue) : 0;
        const bNum = bValue ? Number(bValue) : 0;
        
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }
      
      // Handle sorting for string values with null checks
      if (typeof aValue === "string" || typeof bValue === "string") {
        // Convert null/undefined to empty strings for comparison
        const aStr = aValue ? String(aValue) : '';
        const bStr = bValue ? String(bValue) : '';
        
        return sortDirection === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }
      
      // Handle numeric values with null checks
      const aNum = aValue !== null && aValue !== undefined ? Number(aValue) : 0;
      const bNum = bValue !== null && bValue !== undefined ? Number(bValue) : 0;
      
      return sortDirection === "asc"
        ? aNum - bNum
        : bNum - aNum;
    });

  // Calculate pagination
  const totalItems = filteredDomains.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDomains = filteredDomains.slice(startIndex, startIndex + itemsPerPage);

  // Domain form component
  const DomainForm = ({ domain, onSubmit }: { 
    domain?: Domain | null, 
    onSubmit: (data: DomainFormValues & { id?: number }) => void 
  }) => {
    const defaultValues: DomainFormValues = domain ? {
      websiteName: domain.websiteName || "",
      websiteUrl: domain.websiteUrl || "",
      domainRating: domain.domainRating || "",
      websiteTraffic: domain.websiteTraffic || 0,
      niche: domain.niche || "",
      type: domain.type as "guest_post" | "niche_edit" | "both",
      guestPostPrice: domain.guestPostPrice || "",
      nicheEditPrice: domain.nicheEditPrice || "",
      guidelines: domain.guidelines || "",
    } : {
      websiteName: "",
      websiteUrl: "",
      domainRating: "",
      websiteTraffic: 0,
      niche: "",
      type: "both",
      guestPostPrice: "",
      nicheEditPrice: "",
      guidelines: "",
    };

    const form = useForm<DomainFormValues>({
      resolver: zodResolver(domainFormSchema),
      defaultValues
    });

    const handleSubmit = (data: DomainFormValues) => {
      if (domain) {
        onSubmit({ ...data, id: domain.id });
      } else {
        onSubmit(data);
      }
    };

    const domainType = form.watch("type");

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Website name field is now optional and not shown in the form */}
          <FormField
            control={form.control}
            name="websiteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website URL</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col sm:flex-row gap-4">
            <FormField
              control={form.control}
              name="domainRating"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Domain Rating (DR)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 55" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="websiteTraffic"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Website Traffic</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 25000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Niche field is now optional and not shown in the form */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placement Type</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select placement type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="guest_post">Guest Post</SelectItem>
                    <SelectItem value="niche_edit">Niche Edit</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col sm:flex-row gap-4">
            {(domainType === "guest_post" || domainType === "both") && (
              <FormField
                control={form.control}
                name="guestPostPrice"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Guest Post Price</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 250" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {(domainType === "niche_edit" || domainType === "both") && (
              <FormField
                control={form.control}
                name="nicheEditPrice"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Niche Edit Price</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 180" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          <FormField
            control={form.control}
            name="guidelines"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guidelines</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter placement guidelines or restrictions"
                    className="min-h-[100px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="pt-4 flex justify-end space-x-2">
            <Button type="submit" disabled={isActionInProgress}>
              {isActionInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {domain ? "Updating..." : "Adding..."}
                </>
              ) : (
                <>{domain ? "Update Domain" : "Add Domain"}</>
              )}
            </Button>
          </div>
        </form>
      </Form>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Domain Inventory</h2>
        
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline"
              onClick={exportDomainsAsCSV}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            
            <Sheet open={showAddDomainSheet} onOpenChange={setShowAddDomainSheet}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Domain
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto max-h-screen">
                <SheetHeader className="sticky top-0 z-10 bg-background pt-6 pb-4">
                  <SheetTitle>Add New Domain</SheetTitle>
                  <SheetDescription>
                    Add a new domain to the inventory
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-140px)] pr-4">
                  <DomainForm 
                    onSubmit={(data) => {
                      addDomainMutation.mutate(data);
                    }}
                  />
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Search domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select 
            value={typeFilter} 
            onValueChange={(value: any) => setTypeFilter(value as "all" | "guest_post" | "niche_edit" | "both")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="guest_post">Guest Post</SelectItem>
              <SelectItem value="niche_edit">Niche Edit</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>

          <Select value={drRange} onValueChange={setDrRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Domain Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All DR</SelectItem>
              <SelectItem value="0-30">DR 0-30</SelectItem>
              <SelectItem value="31-50">DR 31-50</SelectItem>
              <SelectItem value="51-70">DR 51-70</SelectItem>
              <SelectItem value="71+">DR 71+</SelectItem>
            </SelectContent>
          </Select>

          <Select value={trafficRange} onValueChange={setTrafficRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Traffic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Traffic</SelectItem>
              <SelectItem value="0-5k">0-5K</SelectItem>
              <SelectItem value="5k-20k">5K-20K</SelectItem>
              <SelectItem value="20k-50k">20K-50K</SelectItem>
              <SelectItem value="50k+">50K+</SelectItem>
            </SelectContent>
          </Select>
        </div>
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

      {/* Table container with horizontal scrolling */}
      <div className="rounded-lg border max-w-[1400px] mx-auto">
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
          <div className="min-w-[1200px]">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead style={{ width: columnWidths.website }}>
                    <Resizable
                      width={columnWidths.website}
                      height={38}
                      onResize={onResize('website')}
                      resizeHandles={['e']}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                      }
                    >
                      <div className="h-full flex items-center pr-4">
                        <SortableHeader field="websiteUrl">Website</SortableHeader>
                      </div>
                    </Resizable>
                  </TableHead>
                  <TableHead style={{ width: columnWidths.dr }}>
                    <Resizable
                      width={columnWidths.dr}
                      height={38}
                      onResize={onResize('dr')}
                      resizeHandles={['e']}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                      }
                    >
                      <div className="h-full flex items-center justify-center pr-4">
                        <SortableHeader field="domainRating">DR</SortableHeader>
                      </div>
                    </Resizable>
                  </TableHead>
                  <TableHead style={{ width: columnWidths.traffic }}>
                    <Resizable
                      width={columnWidths.traffic}
                      height={38}
                      onResize={onResize('traffic')}
                      resizeHandles={['e']}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                      }
                    >
                      <div className="h-full flex items-center justify-center pr-4">
                        <SortableHeader field="websiteTraffic">Traffic</SortableHeader>
                      </div>
                    </Resizable>
                  </TableHead>
                  <TableHead style={{ width: columnWidths.type }}>
                    <Resizable
                      width={columnWidths.type}
                      height={38}
                      onResize={onResize('type')}
                      resizeHandles={['e']}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                      }
                    >
                      <div className="h-full flex items-center pr-4">
                        <SortableHeader field="type">Type</SortableHeader>
                      </div>
                    </Resizable>
                  </TableHead>
                  <TableHead style={{ width: columnWidths.guestPostPrice }}>
                    <Resizable
                      width={columnWidths.guestPostPrice}
                      height={38}
                      onResize={onResize('guestPostPrice')}
                      resizeHandles={['e']}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                      }
                    >
                      <div className="h-full flex items-center justify-center pr-4">
                        <SortableHeader field="guestPostPrice">GP Price</SortableHeader>
                      </div>
                    </Resizable>
                  </TableHead>
                  <TableHead style={{ width: columnWidths.nicheEditPrice }}>
                    <Resizable
                      width={columnWidths.nicheEditPrice}
                      height={38}
                      onResize={onResize('nicheEditPrice')}
                      resizeHandles={['e']}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                      }
                    >
                      <div className="h-full flex items-center justify-center pr-4">
                        <SortableHeader field="nicheEditPrice">NE Price</SortableHeader>
                      </div>
                    </Resizable>
                  </TableHead>
                  <TableHead style={{ width: columnWidths.guestPostTat }}>
                    <Resizable
                      width={columnWidths.guestPostTat}
                      height={38}
                      onResize={onResize('guestPostTat')}
                      resizeHandles={['e']}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                      }
                    >
                      <div className="h-full flex items-center justify-center pr-4">
                        GP TAT (in days)
                      </div>
                    </Resizable>
                  </TableHead>
                  <TableHead style={{ width: columnWidths.nicheEditTat }}>
                    <Resizable
                      width={columnWidths.nicheEditTat}
                      height={38}
                      onResize={onResize('nicheEditTat')}
                      resizeHandles={['e']}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                      }
                    >
                      <div className="h-full flex items-center justify-center pr-4">
                        NE TAT (in days)
                      </div>
                    </Resizable>
                  </TableHead>
                  <TableHead style={{ width: columnWidths.guidelines }}>
                    <Resizable
                      width={columnWidths.guidelines}
                      height={38}
                      onResize={onResize('guidelines')}
                      resizeHandles={['e']}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                      }
                    >
                      <div className="h-full flex items-center pr-4">
                        Guidelines
                      </div>
                    </Resizable>
                  </TableHead>
                  {!isAdmin && (
                    <TableHead style={{ width: columnWidths.action }}>
                      <Resizable
                        width={columnWidths.action}
                        height={38}
                        onResize={onResize('action')}
                        resizeHandles={['e']}
                        handle={
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10" />
                        }
                      >
                        <div className="h-full flex items-center pr-4">
                          Action
                        </div>
                      </Resizable>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDomains.map((domain: Domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="max-w-[200px]">
                      <div className="flex items-center space-x-2">
                        <a
                          href={`https://${domain.websiteUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline truncate"
                        >
                          {domain.websiteUrl}
                          <ExternalLink className="h-4 w-4 shrink-0" />
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(domain.websiteUrl)}
                          className="h-8 w-8 shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{domain.domainRating}</TableCell>
                    <TableCell className="text-center">{Number(domain.websiteTraffic).toLocaleString()}</TableCell>
                    <TableCell>
                      {domain.type === "both"
                        ? "Both"
                        : domain.type === "guest_post"
                          ? "Guest Post"
                          : "Niche Edit"}
                    </TableCell>
                    <TableCell className="text-center">
                      {domain.type !== "niche_edit" && domain.guestPostPrice ? `$${domain.guestPostPrice}` : "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      {domain.type !== "guest_post" && domain.nicheEditPrice ? `$${domain.nicheEditPrice}` : "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      {domain.type !== "niche_edit" ? getGuestPostTAT(domain) : "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      {domain.type !== "guest_post" ? getNicheEditTAT(domain) : "N/A"}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {domain.guidelines ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate block cursor-help">{domain.guidelines}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{domain.guidelines}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground italic">No guidelines</span>
                      )}
                    </TableCell>
                    {!isAdmin ? (
                      <TableCell>
                        <Button
                          onClick={() => setLocation(`/orders/new?domain=${domain.websiteUrl}`)}
                          size="sm"
                        >
                          Place Order
                        </Button>
                      </TableCell>
                    ) : (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Sheet open={domainToEdit?.id === domain.id} onOpenChange={(open) => !open && setDomainToEdit(null)}>
                            <SheetTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setDomainToEdit(domain)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </SheetTrigger>
                            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto max-h-screen">
                              <SheetHeader className="sticky top-0 z-10 bg-background pt-6 pb-4">
                                <SheetTitle>Edit Domain</SheetTitle>
                                <SheetDescription>
                                  Update domain information
                                </SheetDescription>
                              </SheetHeader>
                              <ScrollArea className="h-[calc(100vh-140px)] pr-4">
                                <DomainForm 
                                  domain={domainToEdit}
                                  onSubmit={(data) => {
                                    updateDomainMutation.mutate(data as DomainFormValues & { id: number });
                                  }}
                                />
                              </ScrollArea>
                            </SheetContent>
                          </Sheet>

                          <AlertDialog open={domainToDelete?.id === domain.id} onOpenChange={(open) => !open && setDomainToDelete(null)}>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setDomainToDelete(domain)}
                              >
                                <Trash className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Domain</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this domain? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (domainToDelete) {
                                      deleteDomainMutation.mutate(domainToDelete.id);
                                    }
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  disabled={isActionInProgress}
                                >
                                  {isActionInProgress ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    "Delete"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      
      {/* File import dialog for admins */}
      {isAdmin && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="mt-4">
              <Upload className="h-4 w-4 mr-2" />
              Import Domains
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Import Domains</DialogTitle>
              <DialogDescription>
                Upload a CSV file with domain data to import. The file should have headers matching the domain fields.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="csvFile">CSV File</Label>
                <Input 
                  id="csvFile" 
                  type="file" 
                  accept=".csv" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setImportFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
              {importError && (
                <div className="text-destructive text-sm">{importError}</div>
              )}
              {importPreview.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Preview ({importPreview.length} domains)</h3>
                  <div className="border rounded-md max-h-[200px] overflow-y-auto p-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-1">Website URL</th>
                          <th className="text-left p-1">DR</th>
                          <th className="text-left p-1">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((domain, index) => (
                          <tr key={index} className="border-b border-muted">
                            <td className="p-1">{domain.websiteUrl}</td>
                            <td className="p-1">{domain.domainRating}</td>
                            <td className="p-1">{domain.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setImportFile(null);
                  setImportPreview([]);
                  setImportError("");
                }}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={importPreview.length === 0 ? handleImportPreview : handleImportDomains} 
                disabled={!importFile || importInProgress}
              >
                {importInProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {importPreview.length === 0 ? "Processing..." : "Importing..."}
                  </>
                ) : (
                  importPreview.length === 0 ? "Preview" : "Import"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex items-center justify-center mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <ExtendedPaginationPrevious
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              />
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
              <ExtendedPaginationNext
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