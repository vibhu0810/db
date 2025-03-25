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
}).refine(data => {
  // Validation for Guest Post domains
  if (data.type === "guest_post") {
    // Must have guest post price
    if (!data.guestPostPrice || data.guestPostPrice.trim() === "") {
      return false;
    }
    // Must not have niche edit price
    if (data.nicheEditPrice && data.nicheEditPrice.trim() !== "") {
      return false;
    }
  }
  
  // Validation for Niche Edit domains
  if (data.type === "niche_edit") {
    // Must have niche edit price
    if (!data.nicheEditPrice || data.nicheEditPrice.trim() === "") {
      return false;
    }
    // Must not have guest post price
    if (data.guestPostPrice && data.guestPostPrice.trim() !== "") {
      return false;
    }
  }
  
  // Validation for Both type domains
  if (data.type === "both") {
    // Must have both prices
    if (!data.guestPostPrice || data.guestPostPrice.trim() === "" || 
        !data.nicheEditPrice || data.nicheEditPrice.trim() === "") {
      return false;
    }
  }
  
  return true;
}, {
  message: "Price fields must match the selected domain type. Guest Post domains should only have GP Price, Niche Edit domains should only have NE Price, and Both type domains need both prices.",
  path: ["type"] // Show error on the type field
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
    enabled: true,
  });

  const { user, isAdmin } = useAuth();

  // Handle domain creation/update
  const createDomainMutation = useMutation({
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
        description: "Domain has been added to the inventory"
      });
    },
    onError: (error: Error) => {
      setIsActionInProgress(false);
      toast({
        title: "Failed to add domain",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle domain update
  const updateDomainMutation = useMutation({
    mutationFn: async (data: { id: number, domain: Partial<Domain> }) => {
      setIsActionInProgress(true);
      const res = await apiRequest("PUT", `/api/domains/${data.id}`, data.domain);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update domain");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains'] });
      setDomainToEdit(null);
      setShowAddDomainSheet(false);
      setIsActionInProgress(false);
      toast({
        title: "Domain updated",
        description: "Domain has been updated in the inventory"
      });
    },
    onError: (error: Error) => {
      setIsActionInProgress(false);
      toast({
        title: "Failed to update domain",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle domain deletion
  const deleteDomainMutation = useMutation({
    mutationFn: async (id: number) => {
      setIsActionInProgress(true);
      const res = await apiRequest("DELETE", `/api/domains/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete domain");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains'] });
      setDomainToDelete(null);
      setIsActionInProgress(false);
      toast({
        title: "Domain deleted",
        description: "Domain has been removed from the inventory"
      });
    },
    onError: (error: Error) => {
      setIsActionInProgress(false);
      toast({
        title: "Failed to delete domain",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Function to export domains as CSV
  const exportDomainsAsCSV = () => {
    const headers = ['Website Name', 'Website URL', 'Domain Rating', 'Website Traffic', 'Niche', 'Type', 'Guest Post Price', 'Niche Edit Price', 'Guidelines'];
    const csvData = domains.map((domain: Domain) => [
      domain.websiteName || '',
      domain.websiteUrl || '',
      domain.domainRating || '',
      domain.websiteTraffic || '',
      domain.niche || '',
      domain.type || '',
      domain.guestPostPrice || '',
      domain.nicheEditPrice || '',
      domain.guidelines || ''
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'domains.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  // Handle file import (preview)
  const handleImportPreview = () => {
    if (!importFile) return;
    
    setImportError("");
    setImportInProgress(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error("Failed to read file");
        }
        
        const text = e.target.result as string;
        const lines = text.split('\n');
        
        if (lines.length < 2) {
          throw new Error("File appears to be empty or invalid");
        }
        
        // Get headers and their indices
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const websiteUrlIndex = headers.findIndex(h => 
          h === 'website url' || h === 'websiteurl' || h === 'url' || h === 'website'
        );
        const domainRatingIndex = headers.findIndex(h => 
          h === 'domain rating' || h === 'domainrating' || h === 'dr'
        );
        const websiteTrafficIndex = headers.findIndex(h => 
          h === 'website traffic' || h === 'websitetraffic' || h === 'traffic'
        );
        const typeIndex = headers.findIndex(h => 
          h === 'type'
        );
        const guestPostPriceIndex = headers.findIndex(h => 
          h === 'guest post price' || h === 'guestpostprice' || h === 'gp price'
        );
        const nicheEditPriceIndex = headers.findIndex(h => 
          h === 'niche edit price' || h === 'nicheeditprice' || h === 'ne price'
        );
        const gpTatIndex = headers.findIndex(h => 
          h === 'gp tat (in days)' || h === 'gp tat' || h === 'guest post tat'
        );
        const neTatIndex = headers.findIndex(h => 
          h === 'ne tat (in days)' || h === 'ne tat' || h === 'niche edit tat'
        );
        const guidelinesIndex = headers.findIndex(h => 
          h === 'guidelines' || h === 'requirements'
        );
        
        // Verify the required columns are present
        if (websiteUrlIndex === -1) {
          throw new Error("Required column 'Website URL' is missing");
        }
        
        if (typeIndex === -1) {
          throw new Error("Required column 'Type' is missing");
        }
        
        // Parse the data
        const domainData = [];
        const validationErrors = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          // Handle quoted CSV cells properly
          const cells: string[] = [];
          let currentCell = '';
          let inQuotes = false;
          
          for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              cells.push(currentCell.trim());
              currentCell = '';
            } else {
              currentCell += char;
            }
          }
          
          cells.push(currentCell.trim());
          
          const websiteUrl = websiteUrlIndex >= 0 && cells[websiteUrlIndex] ? cells[websiteUrlIndex].replace(/"/g, '') : '';
          
          if (!websiteUrl) continue;
          
          const domainType = typeIndex >= 0 && cells[typeIndex] ? 
            cells[typeIndex].replace(/"/g, '').toLowerCase() : '';
            
          // Normalize type value
          let normalizedType: 'guest_post' | 'niche_edit' | 'both';
          
          if (domainType.includes('guest') && domainType.includes('niche')) {
            normalizedType = 'both';
          } else if (domainType.includes('guest')) {
            normalizedType = 'guest_post';
          } else if (domainType.includes('niche')) {
            normalizedType = 'niche_edit';
          } else {
            // Default to both if type can't be determined
            normalizedType = 'both';
          }
          
          // Get price and TAT values
          const guestPostPrice = guestPostPriceIndex >= 0 && cells[guestPostPriceIndex] ? 
                                 cells[guestPostPriceIndex].replace(/"/g, '') : null;
          const nicheEditPrice = nicheEditPriceIndex >= 0 && cells[nicheEditPriceIndex] ? 
                                 cells[nicheEditPriceIndex].replace(/"/g, '') : null;
          const gpTat = gpTatIndex >= 0 && cells[gpTatIndex] ? 
                       cells[gpTatIndex].replace(/"/g, '') : null;
          const neTat = neTatIndex >= 0 && cells[neTatIndex] ? 
                       cells[neTatIndex].replace(/"/g, '') : null;
          
          // Validate based on type
          let validationError = '';
          
          if (normalizedType === 'guest_post') {
            if (!guestPostPrice || !gpTat) {
              validationError = `Row ${i}: Guest Post domain must have both GP Price and GP TAT values`;
            }
            if (nicheEditPrice || neTat) {
              validationError = `Row ${i}: Guest Post domain should not have NE Price or NE TAT values`;
            }
          } else if (normalizedType === 'niche_edit') {
            if (!nicheEditPrice || !neTat) {
              validationError = `Row ${i}: Niche Edit domain must have both NE Price and NE TAT values`;
            }
            if (guestPostPrice || gpTat) {
              validationError = `Row ${i}: Niche Edit domain should not have GP Price or GP TAT values`;
            }
          } else if (normalizedType === 'both') {
            if (!guestPostPrice || !gpTat || !nicheEditPrice || !neTat) {
              validationError = `Row ${i}: Domain with Both types must have values for GP Price, GP TAT, NE Price, and NE TAT`;
            }
          }
          
          if (validationError) {
            validationErrors.push(validationError);
          }
          
          const domain = {
            websiteUrl,
            domainRating: domainRatingIndex >= 0 && cells[domainRatingIndex] ? cells[domainRatingIndex].replace(/"/g, '') : '',
            websiteTraffic: websiteTrafficIndex >= 0 && cells[websiteTrafficIndex] ? parseInt(cells[websiteTrafficIndex].replace(/"/g, '')) || 0 : 0,
            type: normalizedType,
            guestPostPrice,
            nicheEditPrice,
            guidelines: guidelinesIndex >= 0 && cells[guidelinesIndex] ? cells[guidelinesIndex].replace(/"/g, '') : null
          };
          
          domainData.push(domain);
        }
        
        if (validationErrors.length > 0) {
          throw new Error(`Validation errors found:\n${validationErrors.join('\n')}`);
        }
        
        if (domainData.length === 0) {
          throw new Error("No valid domains found in the file");
        }
        
        setImportPreview(domainData);
        setImportInProgress(false);
        
      } catch (error) {
        setImportPreview([]);
        setImportError(error instanceof Error ? error.message : "Failed to parse CSV file");
        setImportInProgress(false);
      }
    };
    
    reader.onerror = () => {
      setImportPreview([]);
      setImportError("Error reading file");
      setImportInProgress(false);
    };
    
    reader.readAsText(importFile);
  };

  // Handle domain import (actual import)
  const handleImportDomains = () => {
    if (importPreview.length === 0) return;
    importDomainsMutation.mutate(importPreview);
  };

  // Apply filters and sorting
  let filteredDomains = [...domains];
  
  // Apply search filter
  if (searchQuery) {
    filteredDomains = filteredDomains.filter((domain: Domain) => {
      const domainString = `${domain.websiteName?.toLowerCase() || ''} ${domain.websiteUrl.toLowerCase()} ${domain.niche?.toLowerCase() || ''}`;
      return domainString.includes(searchQuery.toLowerCase());
    });
  }
  
  // Apply type filter
  if (typeFilter !== "all") {
    filteredDomains = filteredDomains.filter((domain: Domain) => {
      if (typeFilter === "both") return domain.type === "both";
      if (typeFilter === "guest_post") return domain.type === "guest_post" || domain.type === "both";
      if (typeFilter === "niche_edit") return domain.type === "niche_edit" || domain.type === "both";
      return true;
    });
  }
  
  // Apply DR filter
  if (drRange !== "all") {
    filteredDomains = filteredDomains.filter((domain: Domain) => {
      const dr = parseInt(domain.domainRating) || 0;
      if (drRange === "0-30") return dr >= 0 && dr <= 30;
      if (drRange === "31-50") return dr >= 31 && dr <= 50;
      if (drRange === "51-70") return dr >= 51 && dr <= 70;
      if (drRange === "71+") return dr >= 71;
      return true;
    });
  }
  
  // Apply traffic filter
  if (trafficRange !== "all") {
    filteredDomains = filteredDomains.filter((domain: Domain) => {
      const traffic = domain.websiteTraffic || 0;
      if (trafficRange === "0-1000") return traffic >= 0 && traffic <= 1000;
      if (trafficRange === "1001-10000") return traffic >= 1001 && traffic <= 10000;
      if (trafficRange === "10001-50000") return traffic >= 10001 && traffic <= 50000;
      if (trafficRange === "50001+") return traffic >= 50001;
      return true;
    });
  }
  
  // Apply sorting
  filteredDomains.sort((a: Domain, b: Domain) => {
    const getValue = (domain: Domain, field: string) => {
      if (field === "websiteName") return domain.websiteName || "";
      if (field === "websiteUrl") return domain.websiteUrl;
      if (field === "domainRating") return parseInt(domain.domainRating) || 0;
      if (field === "websiteTraffic") return domain.websiteTraffic || 0;
      if (field === "niche") return domain.niche || "";
      if (field === "type") return domain.type;
      if (field === "guestPostPrice") return domain.guestPostPrice ? parseInt(domain.guestPostPrice.replace(/[^0-9]/g, '')) || 0 : 0;
      if (field === "nicheEditPrice") return domain.nicheEditPrice ? parseInt(domain.nicheEditPrice.replace(/[^0-9]/g, '')) || 0 : 0;
      return "";
    };
    
    const valueA = getValue(a, sortField);
    const valueB = getValue(b, sortField);
    
    if (typeof valueA === "number" && typeof valueB === "number") {
      return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
    } else {
      return sortDirection === "asc" 
        ? String(valueA).localeCompare(String(valueB)) 
        : String(valueB).localeCompare(String(valueA));
    }
  });
  
  // Calculate pagination
  const totalItems = filteredDomains.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedDomains = filteredDomains.slice(startIndex, endIndex);
  
  // Handle handleResize for resizable columns
  const handleResize = (column: string) => (e: React.SyntheticEvent, { size }: { size: { width: number } }) => {
    setColumnWidths({
      ...columnWidths,
      [column]: Math.max(50, size.width) // Set a minimum width of 50px
    });
  };

  // Domain form component
  const DomainForm = ({ domain }: { domain: Domain | null }) => {
    const form = useForm<DomainFormValues>({
      resolver: zodResolver(domainFormSchema),
      defaultValues: domain ? {
        websiteName: domain.websiteName,
        websiteUrl: domain.websiteUrl,
        domainRating: domain.domainRating || "",
        websiteTraffic: domain.websiteTraffic || 0,
        niche: domain.niche || "",
        type: domain.type,
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
      }
    });
    
    // Get the current form type value to show/hide relevant price fields
    const formType = form.watch("type");
    
    const onSubmit = (values: DomainFormValues) => {
      if (domain) {
        updateDomainMutation.mutate({
          id: domain.id,
          domain: values
        });
      } else {
        createDomainMutation.mutate(values);
      }
    };
    
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="websiteName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Example Blog" {...field} />
                </FormControl>
                <FormDescription>
                  The display name of the website
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="websiteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website URL</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. example.com" {...field} />
                </FormControl>
                <FormDescription>
                  The domain name without http/https
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="domainRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain Rating</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="e.g. 75" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="websiteTraffic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Traffic</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 50000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="niche"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Niche/Category</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Technology, Marketing" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Link Type</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="guest_post">Guest Post Only</SelectItem>
                    <SelectItem value="niche_edit">Niche Edit Only</SelectItem>
                    <SelectItem value="both">Both Types</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            {(formType === "guest_post" || formType === "both") && (
              <FormField
                control={form.control}
                name="guestPostPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Post Price</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 350" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {(formType === "niche_edit" || formType === "both") && (
              <FormField
                control={form.control}
                name="nicheEditPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niche Edit Price</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 200" {...field} />
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
                    placeholder="Enter any special guidelines for this domain"
                    className="min-h-[100px]"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setShowAddDomainSheet(false)}>
              Cancel
            </Button>
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
              <SheetContent side="right" className="overflow-y-auto max-w-xl w-full">
                <SheetHeader>
                  <SheetTitle>{domainToEdit ? "Edit Domain" : "Add New Domain"}</SheetTitle>
                  <SheetDescription>
                    {domainToEdit
                      ? "Update domain information in your inventory."
                      : "Add a new domain to your inventory."}
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                  <DomainForm domain={domainToEdit} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
      
      <div className="bg-card rounded-md shadow">
        <div className="p-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="col-span-2">
              <Label htmlFor="search" className="mb-2 block text-sm">Search</Label>
              <Input
                id="search"
                placeholder="Search by name, URL, or niche..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <Label htmlFor="type-filter" className="mb-2 block text-sm">Link Type</Label>
              <Select 
                onValueChange={(value: any) => setTypeFilter(value)} 
                defaultValue="all"
              >
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="guest_post">Guest Post</SelectItem>
                  <SelectItem value="niche_edit">Niche Edit</SelectItem>
                  <SelectItem value="both">Both Types</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="dr-filter" className="mb-2 block text-sm">DR Range</Label>
              <Select 
                onValueChange={(value) => setDrRange(value)} 
                defaultValue="all"
              >
                <SelectTrigger id="dr-filter">
                  <SelectValue placeholder="All DR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All DR</SelectItem>
                  <SelectItem value="0-30">0-30</SelectItem>
                  <SelectItem value="31-50">31-50</SelectItem>
                  <SelectItem value="51-70">51-70</SelectItem>
                  <SelectItem value="71+">71+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="traffic-filter" className="mb-2 block text-sm">Traffic</Label>
              <Select 
                onValueChange={(value) => setTrafficRange(value)} 
                defaultValue="all"
              >
                <SelectTrigger id="traffic-filter">
                  <SelectValue placeholder="All Traffic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Traffic</SelectItem>
                  <SelectItem value="0-1000">0-1,000</SelectItem>
                  <SelectItem value="1001-10000">1,001-10,000</SelectItem>
                  <SelectItem value="10001-50000">10,001-50,000</SelectItem>
                  <SelectItem value="50001+">50,001+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{endIndex} of {totalItems} domains
            </div>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="items-per-page" className="text-sm">Show</Label>
              <Select 
                onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
                  setCurrentPage(1);
                }} 
                defaultValue="10"
              >
                <SelectTrigger id="items-per-page" className="w-[80px]">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto" style={{ maxWidth: '1400px', minWidth: '1200px' }}>
          <div className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer" 
                    style={{ width: `${columnWidths.website}px` }}
                    onClick={() => {
                      if (sortField === "websiteUrl") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("websiteUrl");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <Resizable
                      width={columnWidths.website}
                      height={30}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                      }
                      onResize={handleResize('website')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Website</span>
                        {sortField === "websiteUrl" && (
                          <ChevronDown className={cn("h-4 w-4", {
                            "transform rotate-180": sortDirection === "asc"
                          })} />
                        )}
                      </div>
                    </Resizable>
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer"
                    style={{ width: `${columnWidths.dr}px` }}
                    onClick={() => {
                      if (sortField === "domainRating") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("domainRating");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    <Resizable
                      width={columnWidths.dr}
                      height={30}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                      }
                      onResize={handleResize('dr')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>DR</span>
                        {sortField === "domainRating" && (
                          <ChevronDown className={cn("h-4 w-4", {
                            "transform rotate-180": sortDirection === "asc"
                          })} />
                        )}
                      </div>
                    </Resizable>
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer"
                    style={{ width: `${columnWidths.traffic}px` }}
                    onClick={() => {
                      if (sortField === "websiteTraffic") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("websiteTraffic");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    <Resizable
                      width={columnWidths.traffic}
                      height={30}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                      }
                      onResize={handleResize('traffic')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Traffic</span>
                        {sortField === "websiteTraffic" && (
                          <ChevronDown className={cn("h-4 w-4", {
                            "transform rotate-180": sortDirection === "asc"
                          })} />
                        )}
                      </div>
                    </Resizable>
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer"
                    style={{ width: `${columnWidths.type}px` }}
                    onClick={() => {
                      if (sortField === "type") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("type");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <Resizable
                      width={columnWidths.type}
                      height={30}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                      }
                      onResize={handleResize('type')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Type</span>
                        {sortField === "type" && (
                          <ChevronDown className={cn("h-4 w-4", {
                            "transform rotate-180": sortDirection === "asc"
                          })} />
                        )}
                      </div>
                    </Resizable>
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer"
                    style={{ width: `${columnWidths.guestPostPrice}px` }}
                    onClick={() => {
                      if (sortField === "guestPostPrice") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("guestPostPrice");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    <Resizable
                      width={columnWidths.guestPostPrice}
                      height={30}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                      }
                      onResize={handleResize('guestPostPrice')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>GP Price</span>
                        {sortField === "guestPostPrice" && (
                          <ChevronDown className={cn("h-4 w-4", {
                            "transform rotate-180": sortDirection === "asc"
                          })} />
                        )}
                      </div>
                    </Resizable>
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer"
                    style={{ width: `${columnWidths.nicheEditPrice}px` }}
                    onClick={() => {
                      if (sortField === "nicheEditPrice") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("nicheEditPrice");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    <Resizable
                      width={columnWidths.nicheEditPrice}
                      height={30}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                      }
                      onResize={handleResize('nicheEditPrice')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>NE Price</span>
                        {sortField === "nicheEditPrice" && (
                          <ChevronDown className={cn("h-4 w-4", {
                            "transform rotate-180": sortDirection === "asc"
                          })} />
                        )}
                      </div>
                    </Resizable>
                  </TableHead>
                  
                  <TableHead 
                    style={{ width: `${columnWidths.guestPostTat}px` }}
                  >
                    <Resizable
                      width={columnWidths.guestPostTat}
                      height={30}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                      }
                      onResize={handleResize('guestPostTat')}
                    >
                      <span>GP TAT</span>
                    </Resizable>
                  </TableHead>
                  
                  <TableHead 
                    style={{ width: `${columnWidths.nicheEditTat}px` }}
                  >
                    <Resizable
                      width={columnWidths.nicheEditTat}
                      height={30}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                      }
                      onResize={handleResize('nicheEditTat')}
                    >
                      <span>NE TAT</span>
                    </Resizable>
                  </TableHead>
                  
                  <TableHead 
                    style={{ width: `${columnWidths.guidelines}px` }}
                  >
                    <Resizable
                      width={columnWidths.guidelines}
                      height={30}
                      handle={
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                      }
                      onResize={handleResize('guidelines')}
                    >
                      <span>Guidelines</span>
                    </Resizable>
                  </TableHead>
                  
                  {isAdmin && (
                    <TableHead 
                      style={{ width: `${columnWidths.action}px` }}
                    >
                      <Resizable
                        width={columnWidths.action}
                        height={30}
                        handle={
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                        }
                        onResize={handleResize('action')}
                      >
                        <span>Action</span>
                      </Resizable>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 11 : 10} className="text-center h-24">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2">Loading domains...</p>
                    </TableCell>
                  </TableRow>
                ) : paginatedDomains.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 11 : 10} className="text-center h-24">
                      <p>No domains found. Try adjusting your filters.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDomains.map((domain: Domain) => (
                    <TableRow key={domain.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{domain.websiteName || domain.websiteUrl}</div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <a 
                              href={`https://${domain.websiteUrl}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center hover:underline text-primary"
                            >
                              {domain.websiteUrl}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                          {domain.niche && (
                            <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {domain.niche}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center font-semibold">{domain.domainRating || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right">{domain.websiteTraffic ? domain.websiteTraffic.toLocaleString() : "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          {domain.type === "guest_post" && (
                            <span className="inline-block bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 text-xs px-2 py-0.5 rounded-full">
                              Guest Post
                            </span>
                          )}
                          {domain.type === "niche_edit" && (
                            <span className="inline-block bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100 text-xs px-2 py-0.5 rounded-full">
                              Niche Edit
                            </span>
                          )}
                          {domain.type === "both" && (
                            <span className="inline-block bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 text-xs px-2 py-0.5 rounded-full">
                              Both
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right font-medium">
                          {domain.guestPostPrice ? `$${domain.guestPostPrice}` : 
                            (domain.type === "guest_post" || domain.type === "both") ? "-" : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right font-medium">
                          {domain.nicheEditPrice ? `$${domain.nicheEditPrice}` : 
                            (domain.type === "niche_edit" || domain.type === "both") ? "-" : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center text-sm">
                          {(domain.type === "guest_post" || domain.type === "both") ? 
                            getGuestPostTAT(domain) : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center text-sm">
                          {(domain.type === "niche_edit" || domain.type === "both") ? 
                            getNicheEditTAT(domain) : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {domain.guidelines ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="max-w-[160px] truncate text-sm hover:cursor-help">
                                  {domain.guidelines}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p>{domain.guidelines}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      
                      {isAdmin && (
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDomainToEdit(domain);
                                setShowAddDomainSheet(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Domain</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {domain.websiteName || domain.websiteUrl}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteDomainMutation.mutate(domain.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      
      {/* File import dialog and template links for admins */}
      {isAdmin && (
        <div className="flex items-center gap-4 mt-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
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
                    accept=".csv,.xlsx,.xls" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setImportFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Download templates: 
                  <a href="/templates/domains-template.csv" download className="text-primary ml-1 hover:underline">
                    CSV Template
                  </a>
                  <span className="mx-1">|</span>
                  <a href="/templates/domains-template.xlsx" download className="text-primary hover:underline">
                    Excel Template
                  </a>
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
        </div>
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