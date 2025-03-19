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
import { Link } from "wouter";
import { Loader2, ExternalLink } from "lucide-react";

export default function DomainsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [drRange, setDrRange] = useState("all");
  const [trafficRange, setTrafficRange] = useState("all");
  const [priceRange, setPriceRange] = useState("all");

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['/api/domains'],
    queryFn: () => apiRequest("GET", "/api/domains").then(res => res.json()),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const filteredDomains = domains.filter((domain) => {
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

    const lowestPrice = Math.min(
      Number(domain.guestPostPrice) || Infinity,
      Number(domain.nicheEditPrice) || Infinity
    );
    const matchesPrice = priceRange === "all" ||
      (priceRange === "0-100" && lowestPrice <= 100) ||
      (priceRange === "101-300" && lowestPrice > 100 && lowestPrice <= 300) ||
      (priceRange === "301-500" && lowestPrice > 300 && lowestPrice <= 500) ||
      (priceRange === "501+" && lowestPrice > 500);

    return matchesType && matchesSearch && matchesDR && matchesTraffic && matchesPrice;
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
                    {domain.websiteUrl}
                    <ExternalLink className="h-4 w-4" />
                  </a>
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
                <TableCell>
                  {domain.guestPostPrice ? `$${domain.guestPostPrice}` : '-'}
                </TableCell>
                <TableCell>
                  {domain.nicheEditPrice ? `$${domain.nicheEditPrice}` : '-'}
                </TableCell>
                <TableCell>{domain.guidelines}</TableCell>
                <TableCell>
                  <Link href={`/orders/new?domain=${domain.websiteUrl}`}>
                    <Button size="sm">Place Order</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}