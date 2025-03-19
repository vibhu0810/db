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
import { Loader2 } from "lucide-react";

export default function DomainsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: domains = [], isLoading } = useQuery<Domain[]>({
    queryKey: ['/api/domains']
  });

  const filteredDomains = domains.filter((domain) => {
    const matchesType = typeFilter === "all" || domain.type === typeFilter || domain.type === "both";
    const matchesSearch = !searchQuery ||
      domain.websiteUrl.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
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
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Website</TableHead>
                <TableHead>DA</TableHead>
                <TableHead>DR</TableHead>
                <TableHead>Traffic</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Guest Post Price</TableHead>
                <TableHead>Niche Edit Price</TableHead>
                <TableHead>Guidelines</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDomains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell>{domain.websiteUrl}</TableCell>
                  <TableCell>{domain.domainAuthority}</TableCell>
                  <TableCell>{domain.domainRating}</TableCell>
                  <TableCell>{domain.websiteTraffic?.toLocaleString()}</TableCell>
                  <TableCell>
                    {domain.type === "both" 
                      ? "Guest Post & Niche Edit" 
                      : domain.type === "guest_post" 
                        ? "Guest Post" 
                        : "Niche Edit"}
                  </TableCell>
                  <TableCell>
                    {domain.guestPostPrice ? `$${domain.guestPostPrice}` : '-'}
                  </TableCell>
                  <TableCell>
                    {domain.nicheEditPrice ? `$${domain.nicheEditPrice}` : '-'}
                  </TableCell>
                  <TableCell>{domain.guidelines}</TableCell>
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