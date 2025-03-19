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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Domain {
  id: number;
  websiteUrl: string;
  domainRating: string;
  websiteTraffic: number;
  type: string;
  guidelines: string;
  guestPostPrice?: string;
  nicheEditPrice?: string;
}

export default function DomainsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [drRange, setDrRange] = useState("all");
  const [trafficRange, setTrafficRange] = useState("all");
  const [sortField, setSortField] = useState<string>("websiteUrl");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
              <TableHead className="min-w-[200px]">
                <SortableHeader field="websiteUrl">Website</SortableHeader>
              </TableHead>
              <TableHead className="w-[80px]">
                <SortableHeader field="domainRating">DR</SortableHeader>
              </TableHead>
              <TableHead className="w-[100px]">
                <SortableHeader field="websiteTraffic">Traffic</SortableHeader>
              </TableHead>
              <TableHead className="w-[150px]">
                <SortableHeader field="type">Type</SortableHeader>
              </TableHead>
              <TableHead className="min-w-[200px]">Guidelines</TableHead>
              {!isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
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
                    ? "Guest Post & Niche Edit"
                    : domain.type === "guest_post"
                      ? "Guest Post"
                      : "Niche Edit"}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <span className="truncate block">{domain.guidelines}</span>
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