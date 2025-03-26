import React from 'react';
import RoleDashboardLayout from '../../components/role-dashboard-layout';
import { 
  Users, CheckCircle, Clock, DollarSign, 
  BarChart2, Layers, Mail, User, Building,
  Globe, TicketIcon, MessageSquare, ShoppingCart,
  ChevronRight, Calendar, ArrowUpRight, ChevronDown
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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

// Smaller card for performance metrics
const PerformanceCard = ({ 
  title, 
  value, 
  change,
  isPositive = true,
}: { 
  title: string;
  value: string | number;
  change: string;
  isPositive?: boolean;
}) => {
  return (
    <div className="p-4 bg-card rounded-lg border">
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'} flex items-center`}>
        {isPositive ? '↑' : '↓'} {change}
      </div>
    </div>
  );
};

// Activity feed item component
const ActivityItem = ({ 
  user, 
  action, 
  target, 
  time, 
  icon 
}: { 
  user: string; 
  action: string; 
  target: string; 
  time: string; 
  icon: React.ReactNode 
}) => {
  return (
    <div className="flex items-start space-x-3 pb-4 border-b">
      <div className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm">
          <span className="font-medium">{user}</span> {action} <span className="font-medium">{target}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">{time}</p>
      </div>
    </div>
  );
};

// Recent order component
const RecentOrder = ({ 
  id, 
  client, 
  type, 
  status, 
  price, 
  date, 
  manager 
}: { 
  id: number; 
  client: string; 
  type: string; 
  status: string; 
  price: string; 
  date: string; 
  manager: string 
}) => {
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
    <tr className="border-b last:border-none">
      <td className="py-3 px-2">
        <div className="font-medium">#{id}</div>
      </td>
      <td className="py-3 px-2">
        <div className="font-medium">{client}</div>
      </td>
      <td className="py-3 px-2">
        <div className="text-sm">{type}</div>
      </td>
      <td className="py-3 px-2">
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
          {status.replace('_', ' ')}
        </div>
      </td>
      <td className="py-3 px-2">
        <div className="font-medium">{price}</div>
      </td>
      <td className="py-3 px-2">
        <div className="text-sm">{date}</div>
      </td>
      <td className="py-3 px-2">
        <div className="text-sm">{manager}</div>
      </td>
      <td className="py-3 px-2 text-right">
        <a 
          href={`/test/orders/${id}`}
          className="text-primary hover:underline text-sm"
        >
          View
        </a>
      </td>
    </tr>
  );
};

export default function AdminDashboard() {
  const { data: users = [], isLoading: loadingUsers } = useQuery({ 
    queryKey: ['/api/test/admin/users'],
    retry: false
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({ 
    queryKey: ['/api/test/admin/orders'],
    retry: false
  });

  const { data: domains = [], isLoading: loadingDomains } = useQuery({ 
    queryKey: ['/api/test/admin/domains'],
    retry: false
  });

  const { data: tickets = [], isLoading: loadingTickets } = useQuery({ 
    queryKey: ['/api/test/admin/support-tickets'],
    retry: false
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({ 
    queryKey: ['/api/test/admin/invoices'],
    retry: false
  });

  const { data: managers = [], isLoading: loadingManagers } = useQuery({ 
    queryKey: ['/api/test/admin/managers'],
    retry: false
  });

  const { data: inventoryManagers = [], isLoading: loadingInventoryManagers } = useQuery({ 
    queryKey: ['/api/test/admin/inventory-managers'],
    retry: false
  });

  // For data loading states
  const isLoading = loadingUsers || loadingOrders || loadingDomains || loadingTickets || 
                    loadingInvoices || loadingManagers || loadingInventoryManagers;
  
  // Count regular users (not admins, managers, or inventory managers)
  const clientCount = Array.isArray(users) ? users.filter((user: any) => 
    user.role === 'user'
  ).length : 0;
  
  // Count manager and inventory manager totals
  const managerCount = Array.isArray(managers) ? managers.length : 0;
  const inventoryManagerCount = Array.isArray(inventoryManagers) ? inventoryManagers.length : 0;
  
  // Order stats
  const pendingOrdersCount = Array.isArray(orders) ? orders.filter((o: any) => o.status === 'pending').length : 0;
  const inProgressOrdersCount = Array.isArray(orders) ? orders.filter((o: any) => 
    ['researching', 'writing', 'in_progress', 'submitted'].includes(o.status)
  ).length : 0;
  const completedOrdersCount = Array.isArray(orders) ? orders.filter((o: any) => o.status === 'completed').length : 0;
  
  // Generate monthly revenue - using invoices
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const currentMonthInvoices = Array.isArray(invoices) ? invoices.filter((invoice: any) => {
    const invoiceDate = new Date(invoice.createdAt);
    return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
  }) : [];
  
  const monthlyRevenue = currentMonthInvoices.reduce((sum: number, invoice: any) => 
    sum + parseFloat(invoice.amount || 0), 0
  );
  
  // Get open tickets count
  const openTicketsCount = Array.isArray(tickets) ? tickets.filter((t: any) => 
    t.status === 'open' || t.status === 'in_progress'
  ).length : 0;
  
  // Get recent activity - simulated data for now
  const recentActivity = [
    { user: 'Sarah Johnson', action: 'completed', target: 'Order #1234', time: '2 hours ago', icon: <CheckCircle className="h-4 w-4" /> },
    { user: 'Mike Peterson', action: 'assigned', target: 'Ticket #567', time: '3 hours ago', icon: <TicketIcon className="h-4 w-4" /> },
    { user: 'Alex Williams', action: 'added', target: '5 new domains', time: '5 hours ago', icon: <Globe className="h-4 w-4" /> },
    { user: 'Lisa Thompson', action: 'registered', target: 'as a new client', time: '1 day ago', icon: <User className="h-4 w-4" /> },
    { user: 'John Martinez', action: 'placed', target: 'Order #1229', time: '1 day ago', icon: <ShoppingCart className="h-4 w-4" /> },
  ];
  
  // Recent orders - picking the last 5 orders
  const recentOrders = Array.isArray(orders) 
    ? orders
        .sort((a: any, b: any) => new Date(b.dateOrdered).getTime() - new Date(a.dateOrdered).getTime())
        .slice(0, 5)
    : [];

  return (
    <RoleDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Complete platform overview and management
          </p>
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
                value={clientCount}
                icon={<Users className="h-5 w-5" />}
                color="text-blue-600"
                trend={{ value: 8, label: "vs. last month" }}
              />
              <MetricsCard
                title="Active Orders"
                value={pendingOrdersCount + inProgressOrdersCount}
                icon={<Clock className="h-5 w-5" />}
                color="text-amber-600"
                trend={{ value: 12, label: "vs. last month" }}
              />
              <MetricsCard
                title="Monthly Revenue"
                value={`$${monthlyRevenue.toFixed(2)}`}
                icon={<DollarSign className="h-5 w-5" />}
                color="text-green-600"
                trend={{ value: 5, label: "vs. last month" }}
              />
              <MetricsCard
                title="Total Domains"
                value={domains.length}
                icon={<Globe className="h-5 w-5" />}
                color="text-indigo-600"
                trend={{ value: 15, label: "vs. last month" }}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Staff overview */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-card border rounded-lg p-5">
                  <h2 className="text-lg font-semibold mb-4">Staff Overview</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                          <User className="h-5 w-5" />
                        </div>
                        <span className="ml-3 font-medium">User Managers</span>
                      </div>
                      <span className="bg-blue-100 text-blue-600 py-1 px-2 rounded-md text-sm font-medium">
                        {managerCount}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-full">
                          <Layers className="h-5 w-5" />
                        </div>
                        <span className="ml-3 font-medium">Inventory Managers</span>
                      </div>
                      <span className="bg-amber-100 text-amber-600 py-1 px-2 rounded-md text-sm font-medium">
                        {inventoryManagerCount}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 text-green-600 rounded-full">
                          <Building className="h-5 w-5" />
                        </div>
                        <span className="ml-3 font-medium">Clients</span>
                      </div>
                      <span className="bg-green-100 text-green-600 py-1 px-2 rounded-md text-sm font-medium">
                        {clientCount}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-full">
                          <TicketIcon className="h-5 w-5" />
                        </div>
                        <span className="ml-3 font-medium">Open Tickets</span>
                      </div>
                      <span className="bg-purple-100 text-purple-600 py-1 px-2 rounded-md text-sm font-medium">
                        {openTicketsCount}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <a 
                      href="/test/admin/staff" 
                      className="text-sm text-primary hover:underline inline-flex items-center"
                    >
                      View Staff Directory <ChevronRight className="ml-1 h-4 w-4" />
                    </a>
                    <a 
                      href="/test/admin/invite" 
                      className="text-sm bg-primary text-white hover:bg-primary/90 px-3 py-1.5 rounded"
                    >
                      Invite
                    </a>
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div className="bg-card border rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent Activity</h2>
                    <a href="/test/admin/activity" className="text-sm text-primary hover:underline">
                      View All
                    </a>
                  </div>
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <ActivityItem 
                        key={index}
                        user={activity.user}
                        action={activity.action}
                        target={activity.target}
                        time={activity.time}
                        icon={activity.icon}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Main content */}
              <div className="lg:col-span-3 space-y-6">
                {/* Performance overview */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Performance Overview</h2>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">This Month</span>
                      <button className="p-1 rounded-md hover:bg-muted">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <PerformanceCard
                      title="Completed Orders"
                      value={completedOrdersCount}
                      change="12% from last month"
                      isPositive={true}
                    />
                    <PerformanceCard
                      title="Average Turnaround"
                      value="4.2 days"
                      change="0.5 days faster"
                      isPositive={true}
                    />
                    <PerformanceCard
                      title="Satisfaction Rate"
                      value="95%"
                      change="3% from last month"
                      isPositive={true}
                    />
                    <PerformanceCard
                      title="Avg. Order Value"
                      value={`$${(monthlyRevenue / Math.max(1, currentMonthInvoices.length)).toFixed(2)}`}
                      change="2% from last month"
                      isPositive={true}
                    />
                  </div>
                </div>
                
                {/* Recent orders */}
                <div className="bg-card border rounded-lg p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Recent Orders</h2>
                    <a 
                      href="/test/admin/orders" 
                      className="text-sm text-primary hover:underline inline-flex items-center"
                    >
                      View All Orders <ChevronRight className="ml-1 h-4 w-4" />
                    </a>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b">
                          <th className="font-medium py-3 px-2">Order ID</th>
                          <th className="font-medium py-3 px-2">Client</th>
                          <th className="font-medium py-3 px-2">Type</th>
                          <th className="font-medium py-3 px-2">Status</th>
                          <th className="font-medium py-3 px-2">Price</th>
                          <th className="font-medium py-3 px-2">Date</th>
                          <th className="font-medium py-3 px-2">Manager</th>
                          <th className="font-medium py-3 px-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order: any) => {
                          const userObj = Array.isArray(users) ? users.find((u: any) => u.id === order.userId) : null;
                          const managerObj = Array.isArray(managers) ? managers.find((m: any) => 
                            Array.isArray(m.managedUsers) && m.managedUsers.includes(order.userId)
                          ) : null;
                          
                          return (
                            <RecentOrder
                              key={order.id}
                              id={order.id}
                              client={userObj?.companyName || userObj?.username || 'Unknown'}
                              type={order.type === 'guest_post' ? 'Guest Post' : 'Niche Edit'}
                              status={order.status}
                              price={`$${order.price}`}
                              date={new Date(order.dateOrdered).toLocaleDateString()}
                              manager={managerObj?.username || 'Unassigned'}
                            />
                          );
                        })}
                        
                        {recentOrders.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-4 text-center text-muted-foreground">
                              No recent orders found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Quick actions */}
                <div className="bg-card border rounded-lg p-5">
                  <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <a href="/test/admin/orders/new" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                      <ShoppingCart className="h-8 w-8 mb-2 mx-auto text-primary" />
                      <span className="font-medium">New Order</span>
                    </a>
                    <a href="/test/admin/users/invite" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                      <Mail className="h-8 w-8 mb-2 mx-auto text-primary" />
                      <span className="font-medium">Invite User</span>
                    </a>
                    <a href="/test/admin/reports" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                      <BarChart2 className="h-8 w-8 mb-2 mx-auto text-primary" />
                      <span className="font-medium">Reports</span>
                    </a>
                  </div>
                </div>
                
                {/* Calendar & Upcoming */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-card border rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Upcoming Deadlines</h2>
                      <a href="/test/admin/calendar" className="text-sm text-primary hover:underline inline-flex items-center">
                        Calendar <ChevronRight className="ml-1 h-4 w-4" />
                      </a>
                    </div>
                    <div className="space-y-3">
                      <div className="border rounded-md p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">Order #1245 Delivery</div>
                            <div className="text-sm text-muted-foreground">DailyWire.com guest post</div>
                          </div>
                          <div className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                            Tomorrow
                          </div>
                        </div>
                      </div>
                      <div className="border rounded-md p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">Order #1252 Delivery</div>
                            <div className="text-sm text-muted-foreground">TechCrunch niche edit</div>
                          </div>
                          <div className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
                            2 days left
                          </div>
                        </div>
                      </div>
                      <div className="border rounded-md p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">Invoice #INV-053 Due</div>
                            <div className="text-sm text-muted-foreground">MarketingCo ($750.00)</div>
                          </div>
                          <div className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
                            3 days left
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-card border rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Support Overview</h2>
                      <a href="/test/admin/support" className="text-sm text-primary hover:underline inline-flex items-center">
                        View All <ChevronRight className="ml-1 h-4 w-4" />
                      </a>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 border rounded-md bg-muted/30">
                          <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium text-muted-foreground">Open Tickets</h3>
                            <div className="bg-primary/10 text-primary p-1 rounded-full">
                              <TicketIcon className="h-4 w-4" />
                            </div>
                          </div>
                          <p className="text-2xl font-bold mt-2">{openTicketsCount}</p>
                        </div>
                        <div className="p-3 border rounded-md bg-muted/30">
                          <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium text-muted-foreground">Avg. Response</h3>
                            <div className="bg-primary/10 text-primary p-1 rounded-full">
                              <Clock className="h-4 w-4" />
                            </div>
                          </div>
                          <p className="text-2xl font-bold mt-2">3.5h</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Recent Tickets</h3>
                        {Array.isArray(tickets) && tickets
                          .filter((ticket: any) => ticket.status === 'open' || ticket.status === 'in_progress')
                          .slice(0, 3)
                          .map((ticket: any, index: number) => {
                            const userObj = Array.isArray(users) ? users.find((u: any) => u.id === ticket.userId) : null;
                            return (
                              <a 
                                key={index}
                                href={`/test/admin/support/${ticket.id}`}
                                className="block border rounded-md p-3 hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex justify-between">
                                  <div className="truncate" title={ticket.title}>
                                    <div className="font-medium text-sm">{ticket.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {userObj?.companyName || userObj?.username || 'Unknown user'}
                                    </div>
                                  </div>
                                  <div className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    ticket.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {ticket.status.replace('_', ' ')}
                                  </div>
                                </div>
                              </a>
                            );
                          })
                        }
                        
                        {(!Array.isArray(tickets) || tickets.filter((t: any) => 
                          t.status === 'open' || t.status === 'in_progress'
                        ).length === 0) && (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            No open tickets
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleDashboardLayout>
  );
}