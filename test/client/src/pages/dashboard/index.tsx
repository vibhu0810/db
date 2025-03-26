import React from 'react';
import RoleDashboardLayout from '../../components/role-dashboard-layout';
import { 
  ShoppingCart, CheckCircle, Clock, AlertCircle, 
  Plus, ExternalLink, Calendar, DollarSign, ChevronRight,
  BarChart2, Globe, Search, MessageSquare
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Order {
  id: number;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  status: string;
  dateOrdered: string;
  dateCompleted: string | null;
  price: string;
  type: 'guest_post' | 'niche_edit';
  title: string | null;
  linkUrl: string | null;
  unreadComments?: number;
}

interface Domain {
  id: number;
  websiteName: string;
  websiteUrl: string;
  domainRating: string;
  type: string;
  guestPostPrice?: string;
  nicheEditPrice?: string;
}

// Order card component
const OrderCard = ({ order }: { order: Order }) => {
  const statusColors: Record<string, string> = {
    'pending': 'bg-amber-100 text-amber-800',
    'researching': 'bg-blue-100 text-blue-800',
    'writing': 'bg-indigo-100 text-indigo-800',
    'in_progress': 'bg-blue-100 text-blue-800',
    'submitted': 'bg-purple-100 text-purple-800',
    'published': 'bg-purple-100 text-purple-800',
    'completed': 'bg-green-100 text-green-800',
    'canceled': 'bg-red-100 text-red-800'
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            {order.type === 'guest_post' ? (
              <div className="bg-blue-100 text-blue-800 p-2 rounded-md">
                <Plus className="h-4 w-4" />
              </div>
            ) : (
              <div className="bg-purple-100 text-purple-800 p-2 rounded-md">
                <ExternalLink className="h-4 w-4" />
              </div>
            )}
            <div className="ml-3">
              <h3 className="font-medium">Order #{order.id}</h3>
              <p className="text-xs text-muted-foreground">
                {order.type === 'guest_post' ? 'Guest Post' : 'Niche Edit'}
              </p>
            </div>
          </div>
          <div className={`text-xs font-medium py-1 px-3 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
            {order.status.replace('_', ' ')}
          </div>
        </div>
        
        <div className="mb-4">
          <div className="text-sm mb-1 truncate" title={order.targetUrl}>
            <span className="text-muted-foreground">Target URL:</span> {order.targetUrl}
          </div>
          <div className="text-sm truncate" title={order.anchorText}>
            <span className="text-muted-foreground">Anchor Text:</span> {order.anchorText}
          </div>
        </div>
        
        <div className="flex justify-between mb-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Price:</span> <span className="font-medium">${order.price}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Date:</span> {new Date(order.dateOrdered).toLocaleDateString()}
          </div>
        </div>
        
        {order.unreadComments && order.unreadComments > 0 && (
          <div className="bg-primary/10 text-primary p-2 rounded-md text-sm mb-4 flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            {order.unreadComments} new comment{order.unreadComments !== 1 ? 's' : ''}
          </div>
        )}

        {order.linkUrl && (
          <div className="text-sm mb-2">
            <a 
              href={order.linkUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary hover:underline flex items-center"
            >
              View Published Link <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
        )}
      </div>
      
      <div className="bg-muted/20 border-t p-3 flex justify-end">
        <a 
          href={`/test/orders/${order.id}`}
          className="text-sm text-primary hover:underline inline-flex items-center"
        >
          View Details <ChevronRight className="ml-1 h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

// Domain recommendation card
const DomainRecommendation = ({ domain }: { domain: Domain }) => {
  // Determine price display based on domain type
  let priceDisplay = '';
  if (domain.type === 'guest_post' && domain.guestPostPrice) {
    priceDisplay = `$${domain.guestPostPrice}`;
  } else if (domain.type === 'niche_edit' && domain.nicheEditPrice) {
    priceDisplay = `$${domain.nicheEditPrice}`;
  } else if (domain.type === 'both') {
    const gpPrice = domain.guestPostPrice ? `$${domain.guestPostPrice} (GP)` : '';
    const nePrice = domain.nicheEditPrice ? `$${domain.nicheEditPrice} (NE)` : '';
    priceDisplay = [gpPrice, nePrice].filter(Boolean).join(' / ');
  }

  return (
    <div className="p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium truncate" title={domain.websiteName}>
          {domain.websiteName}
        </h3>
        <div className="text-xs font-semibold bg-blue-100 text-blue-800 py-1 px-2 rounded">
          DA: {domain.domainRating || 'N/A'}
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground mb-2 truncate" title={domain.websiteUrl}>
        {domain.websiteUrl}
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{priceDisplay}</span>
        <a 
          href={`/test/domains/${domain.id}`}
          className="text-xs text-primary hover:underline inline-flex items-center"
        >
          Details <ChevronRight className="ml-1 h-3 w-3" />
        </a>
      </div>
    </div>
  );
};

// Statistics card
const StatsCard = ({ 
  title, value, icon, color = 'text-primary bg-primary/10', trend 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode; 
  color?: string;
  trend?: { value: number; direction: 'up' | 'down'; label: string };
}) => {
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
        <h3 className="text-sm text-muted-foreground">{title}</h3>
      </div>
      <div className="mt-1">
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <div className="flex items-center mt-1 text-xs">
            <span className={trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
            </span>
            <span className="text-muted-foreground ml-1">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function UserDashboard() {
  const { data: orders = [], isLoading: loadingOrders } = useQuery({ 
    queryKey: ['/api/test/orders'],
    retry: false
  });

  const { data: domains = [], isLoading: loadingDomains } = useQuery({ 
    queryKey: ['/api/test/domains'],
    retry: false
  });

  const { data: tickets = [], isLoading: loadingTickets } = useQuery({ 
    queryKey: ['/api/test/support-tickets'],
    retry: false
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({ 
    queryKey: ['/api/test/invoices'],
    retry: false
  });

  // For data loading states
  const isLoading = loadingOrders || loadingDomains || loadingTickets || loadingInvoices;

  // Order stats
  const pendingOrders = orders.filter((order: Order) => order.status === 'pending').length;
  const inProgressOrders = orders.filter((order: Order) => 
    ['researching', 'writing', 'in_progress', 'submitted'].includes(order.status)
  ).length;
  const completedOrders = orders.filter((order: Order) => order.status === 'completed').length;
  const publishedOrders = orders.filter((order: Order) => order.status === 'published').length;

  // Get recommended domains - this would normally use some algorithm, but here we'll just take the first few
  const recommendedDomains = domains.slice(0, 3);

  // Get recent orders - last 5 orders
  const recentOrders = orders.slice(0, 5);

  // Monthly spending - calculate from invoices for the current month
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const monthlySpending = invoices
    .filter((invoice: any) => {
      const invoiceDate = new Date(invoice.createdAt);
      return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
    })
    .reduce((sum: number, invoice: any) => sum + parseFloat(invoice.amount || 0), 0);

  return (
    <RoleDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Your Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your SEO and link building command center</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard
                title="Total Orders"
                value={orders.length}
                icon={<ShoppingCart className="h-5 w-5" />}
                color="text-blue-600 bg-blue-100"
              />
              <StatsCard
                title="In Progress"
                value={inProgressOrders + publishedOrders}
                icon={<Clock className="h-5 w-5" />}
                color="text-amber-600 bg-amber-100"
              />
              <StatsCard
                title="Completed"
                value={completedOrders}
                icon={<CheckCircle className="h-5 w-5" />}
                color="text-green-600 bg-green-100"
              />
              <StatsCard
                title="Monthly Spend"
                value={`$${monthlySpending.toFixed(2)}`}
                icon={<DollarSign className="h-5 w-5" />}
                color="text-purple-600 bg-purple-100"
                trend={{ value: 12, direction: 'up', label: 'vs. last month' }}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent orders */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Recent Orders</h2>
                  <a href="/test/orders" className="text-sm text-primary hover:underline inline-flex items-center">
                    View All Orders <ChevronRight className="ml-1 h-4 w-4" />
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentOrders.map((order: Order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                  
                  {recentOrders.length === 0 && (
                    <div className="col-span-2 text-center py-12 bg-card border rounded-lg">
                      <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium">No orders found</h3>
                      <p className="text-muted-foreground mt-1">Place your first order to get started</p>
                      <a href="/test/orders/new" className="inline-flex items-center mt-4 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" />
                        New Order
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar content */}
              <div className="space-y-6">
                {/* Order status */}
                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Order Status</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Pending</span>
                        <span className="font-medium">{pendingOrders}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full" 
                          style={{ width: `${(pendingOrders / Math.max(1, orders.length)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>In Progress</span>
                        <span className="font-medium">{inProgressOrders}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: `${(inProgressOrders / Math.max(1, orders.length)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Published</span>
                        <span className="font-medium">{publishedOrders}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full" 
                          style={{ width: `${(publishedOrders / Math.max(1, orders.length)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Completed</span>
                        <span className="font-medium">{completedOrders}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full" 
                          style={{ width: `${(completedOrders / Math.max(1, orders.length)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommended domains */}
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Recommended Domains</h3>
                    <a href="/test/domains" className="text-xs text-primary hover:underline">
                      View All
                    </a>
                  </div>
                  <div className="space-y-3">
                    {recommendedDomains.map((domain: Domain) => (
                      <DomainRecommendation key={domain.id} domain={domain} />
                    ))}
                    
                    {recommendedDomains.length === 0 && (
                      <div className="text-center py-6">
                        <Globe className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No domains available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Open support tickets */}
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Support Tickets</h3>
                    <a href="/test/support" className="text-xs text-primary hover:underline">
                      View All
                    </a>
                  </div>
                  <div>
                    {tickets
                      .filter((ticket: any) => ticket.status === 'open' || ticket.status === 'in_progress')
                      .slice(0, 3)
                      .map((ticket: any) => (
                        <a 
                          key={ticket.id}
                          href={`/test/support/${ticket.id}`}
                          className="block p-3 border rounded-lg mb-2 hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate" title={ticket.title}>
                              {ticket.title}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              ticket.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Ticket #{ticket.id} • {new Date(ticket.createdAt).toLocaleDateString()}
                          </div>
                        </a>
                      ))
                    }
                    
                    {tickets.filter((ticket: any) => ticket.status === 'open' || ticket.status === 'in_progress').length === 0 && (
                      <div className="text-center py-6">
                        <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                        <p className="text-sm text-muted-foreground">No open tickets</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <a href="/test/orders/new" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <ShoppingCart className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">New Order</span>
                </a>
                <a href="/test/domains" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <Search className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Browse Domains</span>
                </a>
                <a href="/test/support/new" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <MessageSquare className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Support Ticket</span>
                </a>
                <a href="/test/invoices" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <Calendar className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Billing</span>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleDashboardLayout>
  );
}