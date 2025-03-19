import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Order, Domain } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  CircleDollarSign,
  LineChart,
  ShoppingCart,
  TrendingUp,
  PlusCircle,
  Globe,
  Loader2,
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
  const { user } = useAuth();
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: domains = [], isLoading: domainsLoading } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const isLoading = ordersLoading || domainsLoading;

  // Calculate metrics
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === "Completed");
  const completedOrdersCount = completedOrders.length;
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.price), 0);

  // Calculate average DR from completed orders only
  const completedOrderDomains = completedOrders
    .map((order) => domains.find((d) => d.id === order.domainId))
    .filter(Boolean);
  const averageDR =
    completedOrderDomains.length > 0
      ? completedOrderDomains.reduce(
          (sum, domain) => sum + Number(domain?.domainRating || 0),
          0
        ) / completedOrderDomains.length
      : 0;

  // Prepare chart data
  const monthlyOrders = orders.reduce((acc: any[], order) => {
    const month = new Date(order.dateOrdered).toLocaleString("default", {
      month: "short",
    });
    const existing = acc.find((item) => item.month === month);
    if (existing) {
      existing.orders += 1;
      existing.spent += Number(order.price);
    } else {
      acc.push({ month, orders: 1, spent: Number(order.price) });
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user?.firstName || user?.username}!</h2>
          <p className="text-muted-foreground mt-2">Here's what's happening with your orders</p>
        </div>
        <div className="flex gap-4">
          <Link href="/orders/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </Link>
          <Link href="/domains">
            <Button variant="outline">
              <Globe className="mr-2 h-4 w-4" />
              Browse Domains
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {completedOrdersCount} completed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Avg ${(totalSpent / totalOrders || 0).toFixed(2)} per order
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average DR</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageDR.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              From completed orders
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((completedOrdersCount / totalOrders || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Order completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Orders Overview</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={monthlyOrders}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" name="Orders" />
              <YAxis yAxisId="right" orientation="right" name="Spent" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-lg">
                        <p className="text-sm font-medium">{payload[0].payload.month}</p>
                        <p className="text-sm text-muted-foreground">
                          Orders: {payload[0].value}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Spent: ${payload[1].value.toFixed(2)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="spent"
                name="Spent"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}