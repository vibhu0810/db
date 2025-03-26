import React from 'react';
import RoleDashboardLayout from '../../components/role-dashboard-layout';
import { 
  Users, ShoppingCart, Clock, CheckCircle, 
  ChevronRight, Mail, Phone, ExternalLink
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
    <div className="bg-card rounded-lg border hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {client.profilePicture ? (
              <img 
                src={client.profilePicture} 
                alt={client.firstName} 
                className="w-12 h-12 rounded-full object-cover" 
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-semibold">
                {client.firstName?.[0] || client.username[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium">
              {client.firstName} {client.lastName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {client.companyName || client.username}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center">
            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
            <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
          </div>
          {client.phoneNumber && (
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
              <a href={`tel:${client.phoneNumber}`} className="text-primary hover:underline">{client.phoneNumber}</a>
            </div>
          )}
        </div>
      </div>
      <div className="bg-card border-t p-3 flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Client ID: #{client.id}</span>
        <a 
          href={`/test/clients/${client.id}`}
          className="inline-flex items-center text-sm text-primary hover:underline"
        >
          View Details <ChevronRight className="ml-1 h-4 w-4" />
        </a>
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
    <div className="p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <span className="text-sm font-medium">Order #{order.id}</span>
          <span className={`ml-3 text-xs py-1 px-2 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
            {order.status.replace('_', ' ')}
          </span>
        </div>
        <span className="text-sm font-medium">${order.price}</span>
      </div>
      
      <div className="mb-2">
        <p className="text-sm truncate">
          <span className="text-muted-foreground">Type:</span> {order.type === 'guest_post' ? 'Guest Post' : 'Niche Edit'}
        </p>
        <p className="text-sm truncate">
          <span className="text-muted-foreground">Target:</span> {order.targetUrl}
        </p>
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {client.firstName} {client.lastName}
        </span>
        <span>
          {new Date(order.dateOrdered).toLocaleDateString()}
        </span>
      </div>
      
      <div className="mt-4 text-right">
        <a
          href={`/test/orders/${order.id}`}
          className="text-sm text-primary hover:underline inline-flex items-center"
        >
          View Order <ChevronRight className="ml-1 h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

export default function ManagerDashboard() {
  const { data: clients = [], isLoading: loadingClients } = useQuery({ 
    queryKey: ['/api/test/user-assignments'],
    retry: false
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({ 
    queryKey: ['/api/test/orders'],
    retry: false
  });

  // For data loading states
  const isLoading = loadingClients || loadingOrders;

  // Get recent orders - last 5 orders
  const recentOrders = orders.slice(0, 5);

  // Client stats
  const totalClients = clients.length;
  const activeClients = clients.filter((client: any) => 
    orders.some((order: Order) => order.userId === client.id && ['pending', 'researching', 'writing', 'in_progress', 'submitted'].includes(order.status))
  ).length;
  
  // Order stats
  const pendingOrdersCount = orders.filter((o: Order) => o.status === 'pending').length;
  const inProgressOrdersCount = orders.filter((o: Order) => 
    ['researching', 'writing', 'in_progress', 'submitted'].includes(o.status)
  ).length;
  const completedOrdersCount = orders.filter((o: Order) => o.status === 'completed').length;

  return (
    <RoleDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">User Manager Dashboard</h1>
          <p className="text-muted-foreground">Manage your client relationships and orders</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card p-4 rounded-lg border flex items-center">
                <div className="bg-blue-500 p-3 rounded-full text-white mr-4">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Total Clients</p>
                  <p className="text-2xl font-bold">{totalClients}</p>
                </div>
              </div>
              
              <div className="bg-card p-4 rounded-lg border flex items-center">
                <div className="bg-amber-500 p-3 rounded-full text-white mr-4">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Pending Orders</p>
                  <p className="text-2xl font-bold">{pendingOrdersCount}</p>
                </div>
              </div>
              
              <div className="bg-card p-4 rounded-lg border flex items-center">
                <div className="bg-indigo-500 p-3 rounded-full text-white mr-4">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">In Progress</p>
                  <p className="text-2xl font-bold">{inProgressOrdersCount}</p>
                </div>
              </div>
              
              <div className="bg-card p-4 rounded-lg border flex items-center">
                <div className="bg-green-500 p-3 rounded-full text-white mr-4">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Completed</p>
                  <p className="text-2xl font-bold">{completedOrdersCount}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Client List */}
              <div className="lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Your Clients</h2>
                  <a href="/test/my-clients" className="text-sm text-primary hover:underline">
                    View All Clients
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clients.slice(0, 4).map((client: Client) => (
                    <ClientCard key={client.id} client={client} />
                  ))}
                </div>
              </div>

              {/* Recent Orders */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Recent Orders</h2>
                  <a href="/test/client-orders" className="text-sm text-primary hover:underline">
                    View All Orders
                  </a>
                </div>
                <div className="space-y-4">
                  {recentOrders.map((order: Order) => (
                    <RecentOrder 
                      key={order.id} 
                      order={order} 
                      client={clients.find((c: Client) => c.id === order.userId)} 
                    />
                  ))}
                  {recentOrders.length === 0 && (
                    <div className="text-center p-6 bg-card border rounded-lg">
                      <p className="text-muted-foreground">No recent orders found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <a href="/test/client-orders/new" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <ShoppingCart className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Create Order</span>
                </a>
                <a href="/test/clients/add" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <Users className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Add New Client</span>
                </a>
                <a href="/test/support-tickets" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <ExternalLink className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Support Tickets</span>
                </a>
                <a href="/test/feedback" className="p-4 border rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center">
                  <CheckCircle className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <span className="font-medium">Feedback</span>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleDashboardLayout>
  );
}