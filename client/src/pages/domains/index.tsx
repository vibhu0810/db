import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, ChevronDown, Copy } from "lucide-react";
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
  websiteUrl: string;
  domainRating: string;
  websiteTraffic: number;
  type: "guest_post" | "niche_edit" | "both";
  guidelines: string;
  guestPostPrice?: string;
  nicheEditPrice?: string;
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
  
  // Column width states
  const [columnWidths, setColumnWidths] = useState({
    website: 200,
    dr: 80,
    traffic: 100,
    type: 150,
    guestPostPrice: 120,
    nicheEditPrice: 120,
    guestPostTat: 120,
    nicheEditTat: 120,
    guidelines: 200,
    action: 100,
  });

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['/api/domains'],
    queryFn: () => apiRequest("GET", "/api/domains").then(res => res.json()),
  });

  const { isAdmin } = useAuth();

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
    const newWidth = Math.min(size.width, maxWidth);
    
    setColumnWidths(prev => ({
      ...prev,
      [column]: newWidth
    }));
  };

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
      const aValue = (a as any)[sortField];
      const bValue = (b as any)[sortField];

      if (typeof aValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

  // Calculate pagination
  const totalItems = filteredDomains.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDomains = filteredDomains.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Domain Inventory</h2>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Search domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
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

      <div className="rounded-lg border overflow-x-auto">
        <Table>
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
                  <div className="h-full flex items-center pr-4">
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
                  <div className="h-full flex items-center pr-4">
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
                  <div className="h-full flex items-center pr-4">
                    Guest Post Price
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
                  <div className="h-full flex items-center pr-4">
                    Niche Edit Price
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
                  <div className="h-full flex items-center pr-4">
                    Guest Post TAT
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
                  <div className="h-full flex items-center pr-4">
                    Niche Edit TAT
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
                <TableCell>{domain.domainRating}</TableCell>
                <TableCell>{Number(domain.websiteTraffic).toLocaleString()}</TableCell>
                <TableCell>
                  {domain.type === "both"
                    ? "Both"
                    : domain.type === "guest_post"
                      ? "Guest Post"
                      : "Niche Edit"}
                </TableCell>
                <TableCell>${domain.guestPostPrice}</TableCell>
                <TableCell>${domain.nicheEditPrice}</TableCell>
                <TableCell>{getGuestPostTAT(domain)}</TableCell>
                <TableCell>{getNicheEditTAT(domain)}</TableCell>
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
                {!isAdmin && (
                  <TableCell>
                    <Button
                      onClick={() => setLocation(`/orders/new?domain=${domain.websiteUrl}`)}
                      size="sm"
                    >
                      Place Order
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-center mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
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
              <PaginationNext
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

function getTurnaroundTime(domain: Domain): string {
  if (domain.websiteUrl === "engagebay.com") {
    return "3 working days";
  } else if (domain.websiteUrl === "blog.powr.io") {
    if (domain.type === "guest_post") {
      return "10 working days post content approval";
    } else {
      return "3 working days";
    }
  }
  return "7-14 business days";
}