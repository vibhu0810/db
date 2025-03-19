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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader field="websiteUrl">Website</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="domainRating">DR</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="websiteTraffic">Traffic</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="type">Type</SortableHeader>
              </TableHead>
              <TableHead>Guidelines</TableHead>
              {!isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDomains.map((domain: Domain) => (
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
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(domain.websiteUrl)}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
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
                <TableCell>{domain.guidelines}</TableCell>
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
    </div>
  );
}