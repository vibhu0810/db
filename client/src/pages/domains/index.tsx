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
import { Slider } from "@/components/ui/slider";

export default function DomainsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [daRange, setDaRange] = useState<[number, number]>([0, 100]);
  const [drRange, setDrRange] = useState<[number, number]>([0, 100]);
  const [trafficRange, setTrafficRange] = useState<[number, number]>([0, 100000]);

  const { data: domains = [], isLoading } = useQuery<Domain[]>({
    queryKey: ['/api/domains']
  });

  const filteredDomains = domains.filter((domain) => {
    const matchesType = typeFilter === "all" || domain.type === typeFilter || domain.type === "both";
    const matchesSearch = !searchQuery ||
      domain.websiteUrl.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDA = domain.domainAuthority >= daRange[0] && domain.domainAuthority <= daRange[1];
    const matchesDR = domain.domainRating >= drRange[0] && domain.domainRating <= drRange[1];
    const matchesTraffic = domain.websiteTraffic >= trafficRange[0] && domain.websiteTraffic <= trafficRange[1];

    return matchesType && matchesSearch && matchesDA && matchesDR && matchesTraffic;
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
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Domain Authority (DA)</label>
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
              <label className="text-sm font-medium">Domain Rating (DR)</label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Traffic</label>
              <Slider 
                value={trafficRange}
                onValueChange={setTrafficRange}
                max={100000}
                step={1000}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{trafficRange[0].toLocaleString()}</span>
                <span>{trafficRange[1].toLocaleString()}</span>
              </div>
            </div>
          </div>
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
                  <TableCell>
                    <a 
                      href={`https://${domain.websiteUrl}`} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      {domain.websiteUrl.replace(/^(https?:\/\/)?(www\.)?/, '')}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </TableCell>
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