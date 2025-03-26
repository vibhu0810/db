import React from 'react';
import RoleDashboardLayout from '../../components/role-dashboard-layout';
import { 
  Users, CheckCircle, Clock, AlertCircle, 
  FileText, BarChart2, Search, Phone,
  ArrowUpRight, CalendarClock, DollarSign, Inbox,
  MessageSquare, MailIcon, ChevronRight, User
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Client {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  phoneNumber: string;
  profilePicture: string;
}

interface Order {
  id: number;
  userId: number;
  sourceUrl: string;
  targetUrl: string;
  status: string;
  dateOrdered: string;
  dateCompleted: string | null;
  price: string;
  type: 'guest_post' | 'niche_edit';
}

// Client card component
const ClientCard = ({ client }: { client: Client }) => {
  return (
    <div className="flex flex-col justify-between h-full border rounded-lg bg-card overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            {client.profilePicture ? (
              <img 
                src={client.profilePicture} 
                alt={`${client.firstName} ${client.lastName}`}
                className="w-12 h-12 rounded-full object-cover" 
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
          </div>
          <div className="ml-4">
            <h3 className="font-medium">
              {client.firstName} {client.lastName}
            </h3>
            <p className="text-sm text-muted-foreground">{client.companyName || client.username}</p>
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm">
            <MailIcon className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-muted-foreground truncate" title={client.email}>
              {client.email}
            </span>
          </div>
          {client.phoneNumber && (
            <div className="flex items-center text-sm">
              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground">
                {client.phoneNumber}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <div className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
            Client #{client.id}
          </div>
        </div>
      </div>
      
      <div className="mt-auto">
        <div className="border-t p-3 flex justify-end">
          <a 
            href={`/test/manager/clients/${client.id}`}
            className="text-sm text-primary hover:underline inline-flex items-center"
          >
            View Profile <ChevronRight className="ml-1 h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

// Recent order component
const RecentOrder = ({ order, client }: { order: Order, client: Client }) => {
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
    <div className="border rounded-lg bg-card hover:shadow-sm transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full ${order.status === 'completed' ? 'bg-green-500' : order.status === 'canceled' ? 'bg-red-500' : 'bg-amber-500'} mr-2`}></div>
            <h3 className="font-medium text-sm">Order #{order.id}</h3>
          </div>
          <div className={`text-xs font-medium py-1 px-2.5 rounded-full ${statusColors[order.status] || 'bg-gray-100'}`}>
            {order.status.replace('_', ' ')}
          </div>
        </div>
        
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">Client</div>
          <div className="text-sm font-medium">{client.companyName || `${client.firstName} ${client.lastName}`}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Type</div>
            <div className="text-sm">{order.type === 'guest_post' ? 'Guest Post' : 'Niche Edit'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Price</div>
            <div className="text-sm font-medium">${order.price}</div>
          </div>
        </div>
        
        <div className="mb-2">
          <div className="text-xs text-muted-foreground mb-1">Date Ordered</div>
          <div className="text-sm">{new Date(order.dateOrdered).toLocaleDateString()}</div>
        </div>
      </div>
      
      <div className="border-t p-3 flex justify-end">
        <a 
          href={`/test/orders/${order.id}`}
          className="text-xs text-primary hover:underline inline-flex items-center"
        >
          View Details <ChevronRight className="ml-1 h-3 w-3" />
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
  color = 'text-primary'
}: { 
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: string;
}) => {
  return (
    <div className="bg-card p-5 rounded-lg border hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className={`p-2 rounded-full bg-primary/10 ${color}`}>
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold">{value}</p>
        {trend && (
          <div className="flex items-center">
            <span className={`text-xs ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'} font-medium flex items-center`}>
              <ArrowUpRight className="h-3 w-3 mr-0.5" />
              {trend.value}%
            </span>
            <span className="ml-1 text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ManagerDashboard() {
  const { data: clients = [], isLoading: loadingClients } = useQuery({ 
    queryKey: ['/api/test/manager/clients'],
    retry: false
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({ 
    queryKey: ['/api/test/manager/orders'],
    retry: false
  });

  const { data: tickets = [], isLoading: loadingTickets } = useQuery({ 
    queryKey: ['/api/test/manager/support-tickets'],
    retry: false
  });

  // For data loading states
  const isLoading = loadingClients || loadingOrders || loadingTickets;

  // Activity metrics - for demonstration purposes
  const activeClients = clients.filter((client: Client) => 
    orders.some((order: Order) => order.userId === client.id && ['pending', 'researching', 'writing', 'in_progress', 'submitted'].includes(order.status))
  ).length;
  
  const pendingOrdersCount = orders.filter((o: Order) => o.status === 'pending').length;
  const inProgressOrdersCount = orders.filter((o: Order) => 
    ['researching', 'writing', 'in_progress', 'submitted'].includes(o.status)
  ).length;
  const completedOrdersCount = orders.filter((o: Order) => o.status === 'completed').length;
  
  // Get orders from the current month
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const currentMonthOrders = orders.filter((order: Order) => {
    const orderDate = new Date(order.dateOrdered);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  });
  
  // Clients with recent orders (in the last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const clientsWithRecentOrders = clients.filter((client: Client) => 
    orders.some((order: Order) => 
      order.userId === client.id && new Date(order.dateOrdered) >= thirtyDaysAgo
    )
  );
  
  // Recent orders (last 6)
  const recentOrders = orders
    .sort((a: Order, b: Order) => new Date(b.dateOrdered).getTime() - new Date(a.dateOrdered).getTime())
    .slice(0, 6);

  return (
    <RoleDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">User Manager Dashboard</h1>
          <p className="text-muted-foreground">Manage client accounts and monitor order progress</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Key metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricsCard
                title="Total Clients"
                value={clients.length}
                icon={<Users className="h-5 w-5" />}
                color="text-blue-600"
                trend={{ value: 8, label: "vs. last month" }}
              />
              <MetricsCard
                title="Active Clients"
                value={activeClients}
                icon={<User className="h-5 w-5" />}
                color="text-green-600"
              />
              <MetricsCard
                title="Current Orders"
                value={pendingOrdersCount + inProgressOrdersCount}
                icon={<Clock className="h-5 w-5" />}
                color="text-amber-600"
                trend={{ value: 12, label: "vs. last month" }}
              />
              <MetricsCard
                title="Completed This Month"
                value={currentMonthOrders.filter(o => o.status === 'completed').length}
                icon={<CheckCircle className="h-5 w-5" />}
                color="text-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Client overview */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Client Overview</h2>
                  <a href="/test/manager/clients" className="text-sm text-primary hover:underline inline-flex items-center">
                    View All <ChevronRight className="ml-1 h-4 w-4" />
                  </a>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {clients.slice(0, 4).map((client: Client) => (
                    <ClientCard key={client.id} client={client} />
                  ))}
                  
                  {clients.length === 0 && (
                    <div className="bg-card border rounded-lg p-8 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium">No clients found</h3>
                      <p className="text-muted-foreground mt-1">You don't have any assigned clients yet</p>
                    </div>
                  )}
                </div>
                
                {/* Quick stats */}
                <div className="bg-card border rounded-lg p-5 space-y-4">
                  <h3 className="font-medium">Client Activity</h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Active Clients</span>
                        <span className="font-medium">{activeClients}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full" 
                          style={{ width: `${(activeClients / Math.max(1, clients.length)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Clients with Recent Orders</span>
                        <span className="font-medium">{clientsWithRecentOrders.length}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: `${(clientsWithRecentOrders.length / Math.max(1, clients.length)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent orders */}
              <div className="lg:col-span-2 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Recent Orders</h2>
                  <a href="/test/manager/orders" className="text-sm text-primary hover:underline inline-flex items-center">
                    View All <ChevronRight className="ml-1 h-4 w-4" />
                  </a>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recentOrders.map((order: Order) => (
                    <RecentOrder 
                      key={order.id} 
                      order={order} 
                      client={clients.find((c: Client) => c.id === order.userId)} 
                    />
                  ))}
                  
                  {recentOrders.length === 0 && (
                    <div className="col-span-2 bg-card border rounded-lg p-8 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium">No orders found</h3>
                      <p className="text-muted-foreground mt-1">Your clients haven't placed any orders yet</p>
                    </div>
                  )}
                </div>
                
                {/* Order status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Order status chart */}
                  <div className="bg-card border rounded-lg p-5">
                    <h3 className="font-medium mb-4">Order Status</h3>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Pending</span>
                          <span className="font-medium">{pendingOrdersCount}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full" 
                            style={{ width: `${(pendingOrdersCount / Math.max(1, orders.length)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>In Progress</span>
                          <span className="font-medium">{inProgressOrdersCount}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${(inProgressOrdersCount / Math.max(1, orders.length)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Completed</span>
                          <span className="font-medium">{completedOrdersCount}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full" 
                            style={{ width: `${(completedOrdersCount / Math.max(1, orders.length)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Support tickets */}
                  <div className="bg-card border rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Open Support Tickets</h3>
                      <a href="/test/manager/support" className="text-xs text-primary hover:underline">
                        View All
                      </a>
                    </div>
                    
                    <div className="space-y-3">
                      {tickets
                        .filter((t: any) => t.status === 'open' || t.status === 'in_progress')
                        .slice(0, 3)
                        .map((ticket: any) => (
                          <a 
                            key={ticket.id}
                            href={`/test/manager/support/${ticket.id}`}
                            className="block p-3 border rounded-md hover:bg-accent transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium text-sm mb-1 truncate" title={ticket.title}>
                                  {ticket.title}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {clients.find((c: Client) => c.id === ticket.userId)?.companyName || 'Unknown client'} • {new Date(ticket.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className={`text-xs px-2 py-0.5 rounded-full ${
                                ticket.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {ticket.status.replace('_', ' ')}
                              </div>
                            </div>
                          </a>
                        ))
                      }
                      
                      {tickets.filter((t: any) => t.status === 'open' || t.status === 'in_progress').length === 0 && (
                        <div className="text-center py-8">
                          <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                          <p className="text-sm text-muted-foreground">No open tickets</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <a href="/test/manager/clients" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <Users className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">View Clients</span>
                </a>
                <a href="/test/manager/orders/new" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <FileText className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Create Order</span>
                </a>
                <a href="/test/manager/support" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <MessageSquare className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Support Tickets</span>
                </a>
                <a href="/test/manager/reports" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <BarChart2 className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Reports</span>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleDashboardLayout>
  );
}