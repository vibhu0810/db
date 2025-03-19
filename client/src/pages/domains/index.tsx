import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useQuery } from "@tanstack/react-query";
import { Domain } from "@shared/schema";
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
import { Link } from "wouter";
import { Loader2, ArrowUpDown, ExternalLink } from "lucide-react";
import { Slider } from "@/components/ui/slider";

type SortConfig = {
  column: keyof Domain | null;
  direction: 'asc' | 'desc';
};

export default function Domains() {
  // Filters
  const [daRange, setDaRange] = useState<[number, number]>([0, 100]);
  const [drRange, setDrRange] = useState<[number, number]>([0, 100]);
  const [trafficMin, setTrafficMin] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: 'asc'
  });

  const { data: domains = [], isLoading } = useQuery<Domain[]>({
    queryKey: ['/api/domains']
  });

  const handleSort = (column: keyof Domain) => {
    setSortConfig(current => ({
      column,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedDomains = domains
    .filter((domain) => {
      const matchesDA = domain.domainAuthority >= daRange[0] && domain.domainAuthority <= daRange[1];
      const matchesDR = domain.domainRating >= drRange[0] && domain.domainRating <= drRange[1];
      const matchesTraffic = !trafficMin || (domain.websiteTraffic >= parseInt(trafficMin));
      const matchesType = typeFilter === "all" || domain.type === typeFilter;
      const matchesPrice = domain.price >= priceRange[0] && domain.price <= priceRange[1];
      const matchesSearch = !searchQuery || 
        domain.websiteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        domain.websiteUrl.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDA && matchesDR && matchesTraffic && matchesType && matchesPrice && matchesSearch;
    })
    .sort((a, b) => {
      if (!sortConfig.column) return 0;

      const aValue = a[sortConfig.column];
      const bValue = b[sortConfig.column];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Domain Inventory</h2>

        <div className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="guest_post">Guest Post</SelectItem>
                <SelectItem value="niche_edit">Niche Edit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Domain Authority Range</label>
              <Slider 
                value={daRange}
                onValueChange={setDaRange}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{daRange[0]}</span>
                <span>{daRange[1]}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Domain Rating Range</label>
              <Slider 
                value={drRange}
                onValueChange={setDrRange}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{drRange[0]}</span>
                <span>{drRange[1]}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium">Minimum Traffic</label>
              <Input
                type="number"
                placeholder="Minimum traffic"
                value={trafficMin}
                onChange={(e) => setTrafficMin(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Price Range</label>
              <Slider 
                value={priceRange}
                onValueChange={setPriceRange}
                max={1000}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>${priceRange[0]}</span>
                <span>${priceRange[1]}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('websiteUrl')}>
                    Website
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('domainAuthority')}>
                    DA
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('domainRating')}>
                    DR
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('websiteTraffic')}>
                    Traffic
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('price')}>
                    Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedDomains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{domain.websiteName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        {domain.websiteUrl.replace(/^(https?:\/\/)?(www\.)?/, '')}
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{domain.domainAuthority?.toFixed(1) ?? 'N/A'}</TableCell>
                  <TableCell>{domain.domainRating?.toFixed(1) ?? 'N/A'}</TableCell>
                  <TableCell>{domain.websiteTraffic?.toLocaleString() ?? 'N/A'}</TableCell>
                  <TableCell>{domain.type === "guest_post" ? "Guest Post" : "Niche Edit"}</TableCell>
                  <TableCell>${Number(domain.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <Link href={`/orders/new?domain=${domain.id}`}>
                      <Button size="sm" asChild>
                        <a>Place Order</a>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardShell>
  );
}