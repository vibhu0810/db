import React, { useState, useEffect, ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, X, ChevronLeft, ChevronRight, MoreHorizontal, Link as LinkIcon, ArrowUpDown, Edit, Trash, Info, Plus, Search } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Domain form schema
const domainFormSchema = z.object({
  websiteName: z.string().min(1, "Website name is required"),
  websiteUrl: z.string().min(1, "Website URL is required").url("Please enter a valid URL"),
  domainRating: z.string().nullable().optional(),
  domainAuthority: z.string().nullable().optional(),
  websiteTraffic: z.coerce.number().nonnegative().nullable().optional(),
  niche: z.string().min(1, "Niche is required"),
  type: z.enum(["guest_post", "niche_edit", "both"]),
  guestPostPrice: z.string().nullable().optional(),
  nicheEditPrice: z.string().nullable().optional(),
  gpTat: z.string().nullable().optional(),
  neTat: z.string().nullable().optional(),
  guidelines: z.string().nullable().optional(),
  isGlobal: z.boolean().optional()
});

type DomainFormValues = z.infer<typeof domainFormSchema>;

interface User {
  id: number;
  username: string;
  email: string;
  companyName: string | null;
}

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
  gpTat?: string | null;
  neTat?: string | null;
  lastMetricsUpdate?: Date | null;
  userId?: number | null;
  isGlobal?: boolean;
}

export default function UserDomainsPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortField, setSortField] = useState("websiteName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  
  const itemsPerPage = 10;

  // Helper function to determine if we have a valid user ID
  useEffect(() => {
    // Check if we have a userId in the URL
    if (params?.userId) {
      const userId = parseInt(params.userId);
      if (!isNaN(userId)) {
        setCurrentUserId(userId);
      }
    }
  }, [params]);

  // Get the user details
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/users', currentUserId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentUserId && isAdmin
  });

  // Get users for selection
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isAdmin
  });

  // Get domains for the selected user
  const { data: domains, isLoading: domainsLoading, refetch: refetchDomains } = useQuery({
    queryKey: ['/api/users', currentUserId, 'domains'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentUserId && isAdmin
  });

  // Create domain mutation
  const createDomainMutation = useMutation({
    mutationFn: async (data: DomainFormValues) => {
      return apiRequest(`/api/users/${currentUserId}/domains`, {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Domain created",
        description: "The domain has been added to the user's inventory",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUserId, 'domains'] });
      setShowAddDomain(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating domain",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Edit domain mutation
  const updateDomainMutation = useMutation({
    mutationFn: async (data: { id: number, updates: Partial<Domain> }) => {
      return apiRequest(`/api/domains/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.updates)
      });
    },
    onSuccess: () => {
      toast({
        title: "Domain updated",
        description: "The domain has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUserId, 'domains'] });
      setEditingDomain(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating domain",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/domains/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Domain deleted",
        description: "The domain has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUserId, 'domains'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting domain",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Form for adding new domains
  const domainForm = useForm<DomainFormValues>({
    resolver: zodResolver(domainFormSchema),
    defaultValues: {
      websiteName: "",
      websiteUrl: "",
      domainRating: "",
      domainAuthority: "",
      websiteTraffic: 0,
      niche: "",
      type: "both",
      guestPostPrice: "",
      nicheEditPrice: "",
      gpTat: "7",
      neTat: "5",
      guidelines: "",
      isGlobal: false
    }
  });

  // Form for editing domain
  const editDomainForm = useForm<DomainFormValues>({
    resolver: zodResolver(domainFormSchema),
    defaultValues: {
      websiteName: "",
      websiteUrl: "",
      domainRating: "",
      domainAuthority: "",
      websiteTraffic: 0,
      niche: "",
      type: "both",
      guestPostPrice: "",
      nicheEditPrice: "",
      gpTat: "7",
      neTat: "5",
      guidelines: "",
      isGlobal: false
    }
  });

  // Set up form values when editing a domain
  useEffect(() => {
    if (editingDomain) {
      editDomainForm.reset({
        websiteName: editingDomain.websiteName,
        websiteUrl: editingDomain.websiteUrl,
        domainRating: editingDomain.domainRating || "",
        domainAuthority: "",
        websiteTraffic: editingDomain.websiteTraffic || 0,
        niche: editingDomain.niche,
        type: editingDomain.type,
        guestPostPrice: editingDomain.guestPostPrice || "",
        nicheEditPrice: editingDomain.nicheEditPrice || "",
        gpTat: editingDomain.gpTat || "",
        neTat: editingDomain.neTat || "",
        guidelines: editingDomain.guidelines || "",
        isGlobal: editingDomain.isGlobal || false
      });
    }
  }, [editingDomain, editDomainForm]);

  // Handle domain form submission
  const onSubmitDomain = (values: DomainFormValues) => {
    if (!currentUserId) return;
    
    createDomainMutation.mutate(values);
  };

  // Handle domain edit form submission
  const onSubmitEditDomain = (values: DomainFormValues) => {
    if (!editingDomain) return;
    
    updateDomainMutation.mutate({
      id: editingDomain.id,
      updates: values
    });
  };

  // Handle user change
  const handleUserChange = (userId: string) => {
    const id = parseInt(userId);
    if (!isNaN(id)) {
      navigate(`/admin/user-domains/${id}`);
      setCurrentUserId(id);
    }
  };

  // Detection of domain information using AI
  const detectDomainInfo = async (url: string) => {
    try {
      const response = await fetch(`/api/domains/info?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error('Failed to detect domain information');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error detecting domain info:', error);
      toast({
        title: "Detection failed",
        description: error instanceof Error ? error.message : "Failed to detect domain information",
        variant: "destructive"
      });
      return null;
    }
  };

  // Handler for the "Detect" button click
  const handleDetect = async () => {
    const url = domainForm.getValues('websiteUrl');
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter a website URL first",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Detecting...",
        description: "Getting information about this domain..."
      });

      const info = await detectDomainInfo(url);
      if (info) {
        domainForm.setValue('websiteName', info.websiteName);
        domainForm.setValue('niche', info.niche);
        
        toast({
          title: "Detection complete",
          description: "Domain information has been filled automatically"
        });
      }
    } catch (error) {
      console.error("Error detecting domain info:", error);
    }
  };

  // Handler for the "Detect" button click when editing
  const handleDetectEdit = async () => {
    const url = editDomainForm.getValues('websiteUrl');
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter a website URL first",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Detecting...",
        description: "Getting information about this domain..."
      });

      const info = await detectDomainInfo(url);
      if (info) {
        editDomainForm.setValue('websiteName', info.websiteName);
        editDomainForm.setValue('niche', info.niche);
        
        toast({
          title: "Detection complete",
          description: "Domain information has been filled automatically"
        });
      }
    } catch (error) {
      console.error("Error detecting domain info:", error);
    }
  };

  // Filter and sort domains
  const filteredDomains = React.useMemo(() => {
    if (!domains) return [];
    
    let filtered = [...domains];
    
    // Apply text search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((domain: Domain) => 
        (domain.websiteName ? domain.websiteName.toLowerCase().includes(term) : false) || 
        (domain.websiteUrl ? domain.websiteUrl.toLowerCase().includes(term) : false) || 
        (domain.niche ? domain.niche.toLowerCase().includes(term) : false)
      );
    }
    
    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter((domain: Domain) => {
        const domainType = domain.type || 'guest_post'; // Default to guest_post if type is null
        return domainType === filterType || 
          (filterType === "guest_post" && domainType === "both") ||
          (filterType === "niche_edit" && domainType === "both");
      });
    }
    
    // Apply sorting
    filtered.sort((a: Domain, b: Domain) => {
      const getValue = (domain: Domain, field: string) => {
        if (!domain) return "";
        
        switch (field) {
          case "websiteName":
            return domain.websiteName ? domain.websiteName.toLowerCase() : "";
          case "websiteUrl":
            return domain.websiteUrl ? domain.websiteUrl.toLowerCase() : "";
          case "domainRating":
            return parseFloat(domain.domainRating || "0");
          case "websiteTraffic":
            return domain.websiteTraffic || 0;
          case "niche":
            return domain.niche ? domain.niche.toLowerCase() : "";
          case "type":
            return domain.type || "";
          case "guestPostPrice":
            return parseFloat(domain.guestPostPrice || "0");
          case "nicheEditPrice":
            return parseFloat(domain.nicheEditPrice || "0");
          default:
            return "";
        }
      };
      
      const valA = getValue(a, sortField);
      const valB = getValue(b, sortField);
      
      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc" 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc"
          ? Number(valA) - Number(valB)
          : Number(valB) - Number(valA);
      }
    });
    
    return filtered;
  }, [domains, searchTerm, filterType, sortField, sortDirection]);
  
  // Pagination logic
  const totalPages = Math.ceil((filteredDomains?.length || 0) / itemsPerPage);
  const paginatedDomains = filteredDomains?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Function to change sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  if (!isAdmin) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="text-muted-foreground mt-2">You don't have permission to view this page.</p>
          <Button className="mt-4" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">User Domain Inventory</h1>
          <p className="text-muted-foreground">
            Manage domain inventory for specific users
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!currentUserId ? (
            <Select value={currentUserId?.toString() || ""} onValueChange={handleUserChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {usersLoading ? (
                  <div className="p-2">Loading users...</div>
                ) : (
                  users?.filter((u: User) => !u.is_admin).map((user: User) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.companyName || user.username}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          ) : (
            <Button variant="outline" onClick={() => navigate('/admin/user-domains')}>
              Change User
            </Button>
          )}
          
          {currentUserId && (
            <Button 
              onClick={() => setShowAddDomain(true)}
              className="flex items-center gap-1"
            >
              <Plus size={16} />
              Add Domain
            </Button>
          )}
        </div>
      </div>
      
      {currentUserId ? (
        <div>
          {userLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-72" />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>
                    User: {user?.companyName || user?.username}
                  </CardTitle>
                  <CardDescription>
                    Email: {user?.email}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Search domains..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-[300px]"
                      />
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="guest_post">Guest Post</SelectItem>
                          <SelectItem value="niche_edit">Niche Edit</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Badge variant="outline" className="ml-auto">
                      {filteredDomains?.length || 0} domains
                    </Badge>
                  </div>
                  
                  {domainsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : filteredDomains?.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground mb-4">No domains found for this user</p>
                      <Button onClick={() => setShowAddDomain(true)}>
                        Add First Domain
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[250px]">
                                <Button variant="ghost" onClick={() => handleSort("websiteName")} className="flex items-center gap-1">
                                  Website Name
                                  <ArrowUpDown size={14} />
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button variant="ghost" onClick={() => handleSort("websiteUrl")} className="flex items-center gap-1">
                                  URL
                                  <ArrowUpDown size={14} />
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button variant="ghost" onClick={() => handleSort("domainRating")} className="flex items-center gap-1">
                                  DR
                                  <ArrowUpDown size={14} />
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button variant="ghost" onClick={() => handleSort("websiteTraffic")} className="flex items-center gap-1">
                                  Traffic
                                  <ArrowUpDown size={14} />
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button variant="ghost" onClick={() => handleSort("niche")} className="flex items-center gap-1">
                                  Niche
                                  <ArrowUpDown size={14} />
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button variant="ghost" onClick={() => handleSort("type")} className="flex items-center gap-1">
                                  Type
                                  <ArrowUpDown size={14} />
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button variant="ghost" onClick={() => handleSort("guestPostPrice")} className="flex items-center gap-1">
                                  GP Price
                                  <ArrowUpDown size={14} />
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button variant="ghost" onClick={() => handleSort("nicheEditPrice")} className="flex items-center gap-1">
                                  NE Price
                                  <ArrowUpDown size={14} />
                                </Button>
                              </TableHead>
                              <TableHead className="w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedDomains.map((domain: Domain) => (
                              <TableRow key={domain.id}>
                                <TableCell className="font-medium w-[250px]">{domain.websiteName}</TableCell>
                                <TableCell>
                                  {domain.websiteUrl ? (
                                    <a 
                                      href={domain.websiteUrl && domain.websiteUrl.startsWith('http') ? domain.websiteUrl : `https://${domain.websiteUrl}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-blue-600 hover:underline"
                                    >
                                      {domain.websiteUrl}
                                      <LinkIcon size={14} />
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>{domain.domainRating || "-"}</TableCell>
                                <TableCell>{domain.websiteTraffic ? domain.websiteTraffic.toLocaleString() : "-"}</TableCell>
                                <TableCell>{domain.niche || "-"}</TableCell>
                                <TableCell>
                                  <Badge variant={(domain.type === "both") ? "default" : (domain.type === "guest_post") ? "secondary" : (domain.type === "niche_edit") ? "outline" : "secondary"}>
                                    {domain.type === "guest_post" ? "Guest Post" : domain.type === "niche_edit" ? "Niche Edit" : domain.type === "both" ? "Both" : "Guest Post"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {domain.guestPostPrice ? `$${domain.guestPostPrice}` : "-"}
                                </TableCell>
                                <TableCell>
                                  {domain.nicheEditPrice ? `$${domain.nicheEditPrice}` : "-"} 
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => setEditingDomain(domain)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {
                                        if (confirm("Are you sure you want to delete this domain?")) {
                                          deleteDomainMutation.mutate(domain.id);
                                        }
                                      }}>
                                        <Trash className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {totalPages > 1 && (
                        <Pagination className="mt-4">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                              />
                            </PaginationItem>
                            {[...Array(totalPages)].map((_, i) => (
                              <PaginationItem key={i + 1}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(i + 1)}
                                  isActive={currentPage === i + 1}
                                >
                                  {i + 1}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">Select a user to manage their domain inventory</h3>
              <p className="text-muted-foreground mb-6">
                You can add, edit, and remove domains from a user's inventory
              </p>
              <Select onValueChange={handleUserChange}>
                <SelectTrigger className="w-[300px] mx-auto">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {usersLoading ? (
                    <div className="p-2">Loading users...</div>
                  ) : (
                    users?.filter((u: User) => !u.is_admin).map((user: User) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.companyName || user.username}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Add Domain Sheet */}
      <Sheet open={showAddDomain} onOpenChange={setShowAddDomain}>
        <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Domain to User Inventory</SheetTitle>
            <SheetDescription>
              Add a new domain to {user?.companyName || user?.username}'s inventory.
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <Form {...domainForm}>
              <form onSubmit={domainForm.handleSubmit(onSubmitDomain)} className="space-y-4">
                <div className="grid grid-cols-2 gap-x-4">
                  <FormField
                    control={domainForm.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Website URL</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="example.com" {...field} />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleDetect}
                            disabled={!domainForm.getValues('websiteUrl')}
                          >
                            Detect
                          </Button>
                        </div>
                        <FormDescription>
                          Enter the domain URL without https://
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={domainForm.control}
                    name="websiteName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Example Blog" {...field} />
                        </FormControl>
                        <FormDescription>
                          The name of the website
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={domainForm.control}
                    name="niche"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Niche</FormLabel>
                        <FormControl>
                          <Input placeholder="Technology" {...field} />
                        </FormControl>
                        <FormDescription>
                          Website niche or category
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-x-4">
                  <FormField
                    control={domainForm.control}
                    name="domainRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain Rating</FormLabel>
                        <FormControl>
                          <Input placeholder="55" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={domainForm.control}
                    name="domainAuthority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain Authority</FormLabel>
                        <FormControl>
                          <Input placeholder="45" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={domainForm.control}
                    name="websiteTraffic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Traffic</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="10000" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={domainForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select domain type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="guest_post">Guest Post Only</SelectItem>
                          <SelectItem value="niche_edit">Niche Edit Only</SelectItem>
                          <SelectItem value="both">Both (Guest Post & Niche Edit)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of content placement this domain accepts
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-x-4">
                  {(domainForm.watch('type') === 'guest_post' || domainForm.watch('type') === 'both') && (
                    <>
                      <FormField
                        control={domainForm.control}
                        name="guestPostPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Guest Post Price ($)</FormLabel>
                            <FormControl>
                              <Input placeholder="150" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={domainForm.control}
                        name="gpTat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GP TAT (days)</FormLabel>
                            <FormControl>
                              <Input placeholder="7" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-x-4">
                  {(domainForm.watch('type') === 'niche_edit' || domainForm.watch('type') === 'both') && (
                    <>
                      <FormField
                        control={domainForm.control}
                        name="nicheEditPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Niche Edit Price ($)</FormLabel>
                            <FormControl>
                              <Input placeholder="100" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={domainForm.control}
                        name="neTat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NE TAT (days)</FormLabel>
                            <FormControl>
                              <Input placeholder="5" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
                
                <FormField
                  control={domainForm.control}
                  name="guidelines"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guidelines</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter any special requirements or guidelines for this domain"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Any special requirements for content submission
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <SheetFooter>
                  <Button type="submit" disabled={createDomainMutation.isPending}>
                    {createDomainMutation.isPending ? "Adding..." : "Add Domain"}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Edit Domain Sheet */}
      <Sheet open={!!editingDomain} onOpenChange={(open) => !open && setEditingDomain(null)}>
        <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Domain</SheetTitle>
            <SheetDescription>
              Update domain details for {editingDomain?.websiteName}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <Form {...editDomainForm}>
              <form onSubmit={editDomainForm.handleSubmit(onSubmitEditDomain)} className="space-y-4">
                <div className="grid grid-cols-2 gap-x-4">
                  <FormField
                    control={editDomainForm.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Website URL</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="example.com" {...field} />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleDetectEdit}
                            disabled={!editDomainForm.getValues('websiteUrl')}
                          >
                            Detect
                          </Button>
                        </div>
                        <FormDescription>
                          Enter the domain URL without https://
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editDomainForm.control}
                    name="websiteName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Example Blog" {...field} />
                        </FormControl>
                        <FormDescription>
                          The name of the website
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editDomainForm.control}
                    name="niche"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Niche</FormLabel>
                        <FormControl>
                          <Input placeholder="Technology" {...field} />
                        </FormControl>
                        <FormDescription>
                          Website niche or category
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-x-4">
                  <FormField
                    control={editDomainForm.control}
                    name="domainRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain Rating</FormLabel>
                        <FormControl>
                          <Input placeholder="55" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editDomainForm.control}
                    name="domainAuthority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain Authority</FormLabel>
                        <FormControl>
                          <Input placeholder="45" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editDomainForm.control}
                    name="websiteTraffic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Traffic</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="10000" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editDomainForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select domain type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="guest_post">Guest Post Only</SelectItem>
                          <SelectItem value="niche_edit">Niche Edit Only</SelectItem>
                          <SelectItem value="both">Both (Guest Post & Niche Edit)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of content placement this domain accepts
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-x-4">
                  {(editDomainForm.watch('type') === 'guest_post' || editDomainForm.watch('type') === 'both') && (
                    <>
                      <FormField
                        control={editDomainForm.control}
                        name="guestPostPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Guest Post Price ($)</FormLabel>
                            <FormControl>
                              <Input placeholder="150" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editDomainForm.control}
                        name="gpTat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GP TAT (days)</FormLabel>
                            <FormControl>
                              <Input placeholder="7" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-x-4">
                  {(editDomainForm.watch('type') === 'niche_edit' || editDomainForm.watch('type') === 'both') && (
                    <>
                      <FormField
                        control={editDomainForm.control}
                        name="nicheEditPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Niche Edit Price ($)</FormLabel>
                            <FormControl>
                              <Input placeholder="100" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editDomainForm.control}
                        name="neTat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NE TAT (days)</FormLabel>
                            <FormControl>
                              <Input placeholder="5" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
                
                <FormField
                  control={editDomainForm.control}
                  name="guidelines"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guidelines</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter any special requirements or guidelines for this domain"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Any special requirements for content submission
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <SheetFooter>
                  <Button type="submit" disabled={updateDomainMutation.isPending}>
                    {updateDomainMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardShell>
  );
}