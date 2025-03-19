import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Order, Domain } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import {
  CircleDollarSign,
  LineChart,
  ShoppingCart,
  TrendingUp,
  Globe,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders/all"],
    queryFn: () => apiRequest("GET", "/api/orders/all").then(res => res.json()),
    enabled: isAdmin,
  });

  const { data: domains = [], isLoading: domainsLoading } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const isLoading = ordersLoading || domainsLoading;

  // Filter orders from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentOrders = orders.filter(order =>
    new Date(order.dateOrdered) >= thirtyDaysAgo
  );

  // Calculate metrics
  const totalOrders = recentOrders.length;
  const pendingOrders = recentOrders.filter(o => o.status === "Sent").length;
  const completedOrders = recentOrders.filter(o => o.status === "Completed").length;
  const rejectedOrders = recentOrders.filter(o => o.status === "Rejected").length;

  // Calculate completion rate
  const completionRate = totalOrders > 0
    ? ((completedOrders / totalOrders) * 100).toFixed(1)
    : "0.0";

  // Get orders that need attention (recently submitted or pending)
  const ordersNeedingAttention = orders
    .filter(o => o.status === "Sent")
    .sort((a, b) => new Date(b.dateOrdered).getTime() - new Date(a.dateOrdered).getTime())
    .slice(0, 5);

  // Prepare chart data for the last 30 days
  const monthlyOrderStats = recentOrders.reduce((acc: any[], order) => {
    const month = new Date(order.dateOrdered).toLocaleString("default", {
      month: "short",
    });
    const existing = acc.find((item) => item.month === month);
    if (existing) {
      existing[order.status] = (existing[order.status] || 0) + 1;
    } else {
      acc.push({
        month,
        Completed: order.status === "Completed" ? 1 : 0,
        Sent: order.status === "Sent" ? 1 : 0,
        Rejected: order.status === "Rejected" ? 1 : 0,
      });
    }
    return acc;
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user?.firstName || user?.username}!</h2>
        <p className="text-muted-foreground mt-2">Here's an overview of order fulfillment in the last 30 days</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting fulfillment
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders}</div>
            <p className="text-xs text-muted-foreground">
              Successfully fulfilled
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Orders</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedOrders}</div>
            <p className="text-xs text-muted-foreground">
              Not fulfilled
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completionRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Order success rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow md:col-span-2">
          <CardHeader>
            <CardTitle>Orders Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={monthlyOrderStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-lg">
                          <p className="text-sm font-medium">{label}</p>
                          {payload.map((entry) => (
                            <p key={entry.name} className="text-sm text-muted-foreground">
                              {entry.name}: {entry.value}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Completed"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="Sent"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="Rejected"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow md:col-span-2">
          <CardHeader>
            <CardTitle>Orders Needing Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ordersNeedingAttention.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div>
                    <p className="font-medium">{order.sourceUrl}</p>
                    <p className="text-sm text-muted-foreground">
                      Ordered by: {order.user?.companyName || order.user?.username}
                    </p>
                  </div>
                  <Link href="/orders">
                    <button className="text-primary hover:underline text-sm">
                      View Details →
                    </button>
                  </Link>
                </div>
              ))}
              {ordersNeedingAttention.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pending orders at the moment
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}