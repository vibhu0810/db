import React, { useState, useEffect } from 'react';
import RoleDashboardLayout from '../../components/role-dashboard-layout';
import { 
  Users, Package, FileText, BarChart, ShoppingCart,
  CheckCircle, AlertCircle, Clock, CreditCard, UserPlus,
  DollarSign, CircleHelp, Globe
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// DashboardCard component for metrics display
const DashboardCard = ({ 
  title, 
  value, 
  icon, 
  description, 
  trend, 
  color = 'bg-primary',
  to
}: { 
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: { value: number; label: string };
  color?: string;
  to?: string;
}) => {
  const cardContent = (
    <div className={`p-6 rounded-lg border hover:shadow-md transition-shadow ${color}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-primary-foreground">{title}</h3>
        <div className={`p-2 rounded-full ${color} text-primary-foreground`}>
          {icon}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-3xl font-bold text-primary-foreground">{value}</p>
        {description && (
          <p className="text-sm text-primary-foreground/70">{description}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <span className={`text-sm ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'} font-medium`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="ml-2 text-xs text-primary-foreground/70">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (to) {
    return <a href={to} className="block">{cardContent}</a>;
  }

  return cardContent;
};

// RecentActivity component for displaying latest events
const RecentActivity = () => {
  const activities = [
    {
      id: 1,
      type: 'order',
      description: 'New order #1082 created',
      user: 'Client One',
      time: '10 minutes ago'
    },
    {
      id: 2,
      type: 'comment',
      description: 'New comment on order #1079',
      user: 'John Smith',
      time: '25 minutes ago'
    },
    {
      id: 3,
      type: 'ticket',
      description: 'Support ticket #45 resolved',
      user: 'Admin',
      time: '1 hour ago'
    },
    {
      id: 4,
      type: 'user',
      description: 'New user registered',
      user: 'Sarah Johnson',
      time: '3 hours ago'
    },
    {
      id: 5,
      type: 'payment',
      description: 'Invoice #89 paid',
      user: 'Client Two',
      time: '5 hours ago'
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="h-4 w-4 text-blue-500" />;
      case 'comment':
        return <FileText className="h-4 w-4 text-indigo-500" />;
      case 'ticket':
        return <CircleHelp className="h-4 w-4 text-purple-500" />;
      case 'user':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'payment':
        return <DollarSign className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-6">
      <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map(activity => (
          <div key={activity.id} className="flex items-start p-3 hover:bg-accent rounded-md transition-colors">
            <div className="mr-3 mt-1">{getIcon(activity.type)}</div>
            <div>
              <p className="font-medium">{activity.description}</p>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <span>{activity.user}</span>
                <span className="mx-2">•</span>
                <span>{activity.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t">
        <a href="/test/activity" className="text-primary text-sm hover:underline">View all activity</a>
      </div>
    </div>
  );
};

// Status overview component
const StatusOverview = () => {
  const statuses = [
    { label: 'Active Orders', value: 24, icon: <Clock className="h-5 w-5" />, color: 'bg-amber-500' },
    { label: 'Pending Approval', value: 7, icon: <AlertCircle className="h-5 w-5" />, color: 'bg-red-500' },
    { label: 'Completed', value: 156, icon: <CheckCircle className="h-5 w-5" />, color: 'bg-green-500' },
    { label: 'Due Invoices', value: 12, icon: <CreditCard className="h-5 w-5" />, color: 'bg-blue-500' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statuses.map((status, index) => (
        <div key={index} className="bg-card p-4 rounded-lg border flex items-center">
          <div className={`${status.color} p-3 rounded-full text-white mr-4`}>
            {status.icon}
          </div>
          <div>
            <p className="text-muted-foreground text-sm">{status.label}</p>
            <p className="text-2xl font-bold">{status.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const { data: users = [], isLoading: loadingUsers } = useQuery({ 
    queryKey: ['/api/test/users'],
    retry: false
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({ 
    queryKey: ['/api/test/orders'],
    retry: false
  });

  const { data: domains = [], isLoading: loadingDomains } = useQuery({ 
    queryKey: ['/api/test/domains'],
    retry: false
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({ 
    queryKey: ['/api/test/invoices'],
    retry: false
  });

  // Calculate revenue summary
  const revenue = {
    total: invoices.reduce((sum: number, invoice: any) => sum + parseFloat(invoice.amount || 0), 0),
    pending: invoices.filter((invoice: any) => invoice.status === 'pending')
      .reduce((sum: number, invoice: any) => sum + parseFloat(invoice.amount || 0), 0),
    overdue: invoices.filter((invoice: any) => invoice.status === 'overdue')
      .reduce((sum: number, invoice: any) => sum + parseFloat(invoice.amount || 0), 0)
  };

  // For data loading states
  const isLoading = loadingUsers || loadingOrders || loadingDomains || loadingInvoices;

  return (
    <RoleDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your administrative overview</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <StatusOverview />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DashboardCard
                title="Total Users"
                value={users.length}
                icon={<Users className="h-6 w-6" />}
                description="All registered users"
                trend={{ value: 12, label: 'vs. last month' }}
                color="bg-indigo-600"
                to="/test/users"
              />
              <DashboardCard
                title="Domains"
                value={domains.length}
                icon={<Globe className="h-6 w-6" />}
                description="Total domains in the system"
                trend={{ value: 5, label: 'vs. last month' }}
                color="bg-purple-600"
                to="/test/admin/domains"
              />
              <DashboardCard
                title="Monthly Revenue"
                value={`$${revenue.total.toFixed(2)}`}
                icon={<DollarSign className="h-6 w-6" />}
                description={`$${revenue.pending.toFixed(2)} pending`}
                trend={{ value: 8, label: 'vs. last month' }}
                color="bg-green-600"
                to="/test/invoices"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentActivity />
              
              <div className="bg-card rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-medium mb-4">Order Status</h3>
                <div className="space-y-4">
                  {/* Pending orders */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Pending</span>
                      <span className="text-sm text-muted-foreground">
                        {orders.filter((o: any) => o.status === 'pending').length} orders
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full" 
                        style={{ 
                          width: `${(orders.filter((o: any) => o.status === 'pending').length / orders.length) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* In progress orders */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">In Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {orders.filter((o: any) => 
                          ['researching', 'writing', 'in_progress'].includes(o.status)
                        ).length} orders
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ 
                          width: `${(orders.filter((o: any) => 
                            ['researching', 'writing', 'in_progress'].includes(o.status)
                          ).length / orders.length) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Published orders */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Published</span>
                      <span className="text-sm text-muted-foreground">
                        {orders.filter((o: any) => o.status === 'published').length} orders
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full" 
                        style={{ 
                          width: `${(orders.filter((o: any) => o.status === 'published').length / orders.length) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Completed orders */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Completed</span>
                      <span className="text-sm text-muted-foreground">
                        {orders.filter((o: any) => o.status === 'completed').length} orders
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full" 
                        style={{ 
                          width: `${(orders.filter((o: any) => o.status === 'completed').length / orders.length) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <a href="/test/orders" className="text-primary text-sm hover:underline">View all orders</a>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleDashboardLayout>
  );
}