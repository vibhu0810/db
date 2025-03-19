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
import { Loader2, ExternalLink } from "lucide-react";

export default function Domains() {
  const [nicheFilter, setNicheFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { data: domains = [], isLoading } = useQuery<Domain[]>({
    queryKey: ['/api/domains']
  });

  const filteredDomains = domains.filter((domain) => {
    const matchesNiche = !nicheFilter || domain.niche === nicheFilter;
    const matchesType = !typeFilter || domain.type === typeFilter;
    const matchesSearch =
      !searchQuery ||
      domain.websiteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      domain.websiteUrl.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesNiche && matchesType && matchesSearch;
  });

  const uniqueNiches = Array.from(
    new Set(domains.map((domain) => domain.niche))
  );

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

        <div className="flex gap-4">
          <Input
            placeholder="Search domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={nicheFilter} onValueChange={setNicheFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by niche" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Niches</SelectItem>
              {uniqueNiches.map((niche) => (
                <SelectItem key={niche} value={niche}>
                  {niche}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="guest_post">Guest Post</SelectItem>
              <SelectItem value="niche_edit">Niche Edit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Website</TableHead>
                <TableHead>Niche</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>DA</TableHead>
                <TableHead>DR</TableHead>
                <TableHead>Traffic</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Available Slots</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDomains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{domain.websiteName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        {domain.websiteUrl}
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{domain.niche}</TableCell>
                  <TableCell>
                    {domain.type === "guest_post" ? "Guest Post" : "Niche Edit"}
                  </TableCell>
                  <TableCell>{Number(domain.domainAuthority).toFixed(1)}</TableCell>
                  <TableCell>{Number(domain.domainRating).toFixed(1)}</TableCell>
                  <TableCell>{domain.websiteTraffic.toLocaleString()}</TableCell>
                  <TableCell>${Number(domain.price).toFixed(2)}</TableCell>
                  <TableCell>{domain.availableSlots}</TableCell>
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
