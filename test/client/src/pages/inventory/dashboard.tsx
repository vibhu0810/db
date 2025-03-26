import React from 'react';
import RoleDashboardLayout from '../../components/role-dashboard-layout';
import { 
  Globe, PlusCircle, ExternalLink, ChevronRight, 
  DollarSign, BarChart2, TrendingUp, Filter, Search
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Domain {
  id: number;
  websiteName: string;
  websiteUrl: string;
  domainRating: string;
  websiteTraffic: number;
  niche: string;
  type: 'guest_post' | 'niche_edit' | 'both';
  guestPostPrice?: string;
  nicheEditPrice?: string;
  isGlobal: boolean;
}

// Domain card component
const DomainCard = ({ domain }: { domain: Domain }) => {
  // Determine price display based on domain type
  let priceDisplay = '';
  if (domain.type === 'guest_post' && domain.guestPostPrice) {
    priceDisplay = `$${domain.guestPostPrice} (GP)`;
  } else if (domain.type === 'niche_edit' && domain.nicheEditPrice) {
    priceDisplay = `$${domain.nicheEditPrice} (NE)`;
  } else if (domain.type === 'both') {
    priceDisplay = domain.guestPostPrice && domain.nicheEditPrice 
      ? `$${domain.guestPostPrice} (GP) / $${domain.nicheEditPrice} (NE)` 
      : '';
  }

  // Extract domain authority from domain rating
  const domainAuthority = parseInt(domain.domainRating || '0');
  
  // Determine color based on domain authority
  const getDARatingColor = (rating: number) => {
    if (rating >= 60) return 'text-green-600 bg-green-100';
    if (rating >= 40) return 'text-amber-600 bg-amber-100';
    return 'text-blue-600 bg-blue-100';
  };

  return (
    <div className="bg-card rounded-lg border hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-medium truncate" title={domain.websiteName}>
            {domain.websiteName}
          </h3>
          <div className={`text-xs font-semibold py-1 px-2 rounded ${getDARatingColor(domainAuthority)}`}>
            DA: {domainAuthority}
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground mb-3 truncate" title={domain.websiteUrl}>
          <a href={`https://${domain.websiteUrl}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary flex items-center">
            {domain.websiteUrl}
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="bg-primary/10 text-primary text-xs rounded-full px-2 py-1">
            {domain.niche || 'General'}
          </span>
          <span className="bg-primary/10 text-primary text-xs rounded-full px-2 py-1">
            {domain.type === 'both' 
              ? 'Guest Post & Niche Edit' 
              : domain.type === 'guest_post' 
                ? 'Guest Post' 
                : 'Niche Edit'}
          </span>
          {domain.isGlobal && (
            <span className="bg-blue-100 text-blue-600 text-xs rounded-full px-2 py-1">
              Global
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm">
            <span className="text-muted-foreground">Traffic:</span>{' '}
            <span className="font-medium">{domain.websiteTraffic?.toLocaleString() || 'Unknown'}</span>
          </div>
          <div className="text-sm font-medium">
            {priceDisplay}
          </div>
        </div>
      </div>
      
      <div className="bg-card border-t p-3 flex justify-between items-center">
        <span className="text-sm text-muted-foreground">ID: #{domain.id}</span>
        <a 
          href={`/test/domains/${domain.id}`}
          className="inline-flex items-center text-sm text-primary hover:underline"
        >
          View Details <ChevronRight className="ml-1 h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

// Metrics card component
const MetricsCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  color = 'bg-primary'
}: { 
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: string;
}) => {
  return (
    <div className="bg-card p-5 rounded-lg border hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className={`p-2 rounded-full ${color} text-primary-foreground`}>
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold">{value}</p>
        {trend && (
          <div className="flex items-center">
            <span className={`text-xs ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="ml-1 text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function InventoryDashboard() {
  const { data: domains = [], isLoading: loadingDomains } = useQuery({ 
    queryKey: ['/api/test/domains'],
    retry: false
  });

  // For data loading states
  const isLoading = loadingDomains;

  // Domain stats
  const totalDomains = domains.length;
  const guestPostDomains = domains.filter((d: Domain) => d.type === 'guest_post' || d.type === 'both').length;
  const nicheEditDomains = domains.filter((d: Domain) => d.type === 'niche_edit' || d.type === 'both').length;
  const globalDomains = domains.filter((d: Domain) => d.isGlobal).length;
  
  // Average metrics
  const avgDomainRating = domains.length > 0 
    ? Math.round(domains.reduce((sum: number, domain: Domain) => 
        sum + parseInt(domain.domainRating || '0'), 0) / domains.length)
    : 0;
  
  const avgTraffic = domains.length > 0
    ? Math.round(domains.reduce((sum: number, domain: Domain) => 
        sum + (domain.websiteTraffic || 0), 0) / domains.length)
    : 0;

  // Top niches
  const nicheCount: Record<string, number> = {};
  domains.forEach((domain: Domain) => {
    if (domain.niche) {
      nicheCount[domain.niche] = (nicheCount[domain.niche] || 0) + 1;
    }
  });
  
  const sortedNiches = Object.entries(nicheCount)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 5);

  return (
    <RoleDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory Manager Dashboard</h1>
          <p className="text-muted-foreground">Manage your domain inventory and pricing</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricsCard
                title="Total Domains"
                value={totalDomains}
                icon={<Globe className="h-5 w-5" />}
                color="bg-blue-600"
              />
              <MetricsCard
                title="Guest Post Domains"
                value={guestPostDomains}
                icon={<PlusCircle className="h-5 w-5" />}
                color="bg-green-600"
              />
              <MetricsCard
                title="Niche Edit Domains"
                value={nicheEditDomains}
                icon={<Filter className="h-5 w-5" />}
                color="bg-purple-600"
              />
              <MetricsCard
                title="Global Domains"
                value={globalDomains}
                icon={<Globe className="h-5 w-5" />}
                color="bg-indigo-600"
              />
            </div>

            {/* Advanced metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricsCard
                title="Average Domain Authority"
                value={avgDomainRating}
                icon={<BarChart2 className="h-5 w-5" />}
                trend={{ value: 5, label: 'vs. last month' }}
                color="bg-amber-600"
              />
              <MetricsCard
                title="Average Monthly Traffic"
                value={avgTraffic.toLocaleString()}
                icon={<TrendingUp className="h-5 w-5" />}
                trend={{ value: 12, label: 'vs. last month' }}
                color="bg-teal-600"
              />
              <MetricsCard
                title="Average GP Price"
                value={`$${Math.round(domains.filter((d: Domain) => d.guestPostPrice)
                  .reduce((sum: number, d: Domain) => sum + parseFloat(d.guestPostPrice || '0'), 0) / 
                  domains.filter((d: Domain) => d.guestPostPrice).length)}`}
                icon={<DollarSign className="h-5 w-5" />}
                trend={{ value: 3, label: 'vs. last month' }}
                color="bg-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Top niches */}
              <div className="col-span-1 bg-card rounded-lg border p-5">
                <h2 className="text-lg font-medium mb-4">Top Niches</h2>
                <div className="space-y-4">
                  {sortedNiches.map(([niche, count]) => (
                    <div key={niche} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{niche}</span>
                        <span className="text-sm text-muted-foreground">
                          {count} domains
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${(count / totalDomains) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  
                  {sortedNiches.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No niches found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent domains */}
              <div className="col-span-1 lg:col-span-3">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">Recent Domains</h2>
                  <div className="flex space-x-2">
                    <a href="/test/domains/add" className="inline-flex items-center px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
                      <PlusCircle className="mr-1 h-4 w-4" />
                      Add Domain
                    </a>
                    <a href="/test/domains" className="text-sm text-primary hover:underline inline-flex items-center">
                      View All
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </a>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {domains.slice(0, 6).map((domain: Domain) => (
                    <DomainCard key={domain.id} domain={domain} />
                  ))}
                  
                  {domains.length === 0 && (
                    <div className="col-span-3 text-center py-12 bg-card border rounded-lg">
                      <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium">No domains found</h3>
                      <p className="text-muted-foreground mt-1">Add your first domain to get started</p>
                      <a href="/test/domains/add" className="inline-flex items-center mt-4 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Domain
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <a href="/test/domains/add" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <PlusCircle className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Add New Domain</span>
                </a>
                <a href="/test/domain-pricing" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <DollarSign className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Manage Pricing</span>
                </a>
                <a href="/test/domains/import" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <Search className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Bulk Import</span>
                </a>
                <a href="/test/domains/metrics" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <BarChart2 className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Domain Metrics</span>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleDashboardLayout>
  );
}