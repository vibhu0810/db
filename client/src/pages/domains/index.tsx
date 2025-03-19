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

export default function DomainsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [daRange, setDaRange] = useState("all");
  const [drRange, setDrRange] = useState("all");
  const [trafficRange, setTrafficRange] = useState("all");
  const [priceRange, setPriceRange] = useState("all");

  const { data: domains = [], isLoading } = useQuery<Domain[]>({
    queryKey: ['/api/domains']
  });

  const filteredDomains = domains.filter((domain) => {
    const matchesType = typeFilter === "all" || domain.type === typeFilter || domain.type === "both";
    const matchesSearch = !searchQuery ||
      domain.websiteUrl.toLowerCase().includes(searchQuery.toLowerCase());

    // DA Range Filter
    const matchesDA = daRange === "all" ||
      (daRange === "0-30" && domain.domainAuthority <= 30) ||
      (daRange === "31-50" && domain.domainAuthority > 30 && domain.domainAuthority <= 50) ||
      (daRange === "51-70" && domain.domainAuthority > 50 && domain.domainAuthority <= 70) ||
      (daRange === "71+" && domain.domainAuthority > 70);

    // DR Range Filter
    const matchesDR = drRange === "all" ||
      (drRange === "0-30" && domain.domainRating <= 30) ||
      (drRange === "31-50" && domain.domainRating > 30 && domain.domainRating <= 50) ||
      (drRange === "51-70" && domain.domainRating > 50 && domain.domainRating <= 70) ||
      (drRange === "71+" && domain.domainRating > 70);

    // Traffic Range Filter
    const matchesTraffic = trafficRange === "all" ||
      (trafficRange === "0-5k" && domain.websiteTraffic <= 5000) ||
      (trafficRange === "5k-20k" && domain.websiteTraffic > 5000 && domain.websiteTraffic <= 20000) ||
      (trafficRange === "20k-50k" && domain.websiteTraffic > 20000 && domain.websiteTraffic <= 50000) ||
      (trafficRange === "50k+" && domain.websiteTraffic > 50000);

    // Price Range Filter (checking both guest post and niche edit prices)
    const lowestPrice = Math.min(
      domain.guestPostPrice || Infinity,
      domain.nicheEditPrice || Infinity
    );
    const matchesPrice = priceRange === "all" ||
      (priceRange === "0-100" && lowestPrice <= 100) ||
      (priceRange === "101-300" && lowestPrice > 100 && lowestPrice <= 300) ||
      (priceRange === "301-500" && lowestPrice > 300 && lowestPrice <= 500) ||
      (priceRange === "501+" && lowestPrice > 500);

    return matchesType && matchesSearch && matchesDA && matchesDR && matchesTraffic && matchesPrice;
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

            <Select value={daRange} onValueChange={setDaRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Domain Authority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All DA</SelectItem>
                <SelectItem value="0-30">DA 0-30</SelectItem>
                <SelectItem value="31-50">DA 31-50</SelectItem>
                <SelectItem value="51-70">DA 51-70</SelectItem>
                <SelectItem value="71+">DA 71+</SelectItem>
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

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-100">$0-$100</SelectItem>
                <SelectItem value="101-300">$101-$300</SelectItem>
                <SelectItem value="301-500">$301-$500</SelectItem>
                <SelectItem value="501+">$501+</SelectItem>
              </SelectContent>
            </Select>
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