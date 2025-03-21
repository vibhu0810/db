import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Order, Domain } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useWelcome } from "@/hooks/use-welcome";
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
  const { data: welcomeData, isLoading: welcomeLoading } = useWelcome();

  // Use different endpoints based on user role
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: [isAdmin ? "/api/orders/all" : "/api/orders"],
    queryFn: () => apiRequest("GET", isAdmin ? "/api/orders/all" : "/api/orders").then(res => res.json()),
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
  const revisionOrders = recentOrders.filter(o => o.status === "Revision").length;

  // Calculate completion rate
  const completionRate = totalOrders > 0
    ? ((completedOrders / totalOrders) * 100).toFixed(1)
    : "0.0";

  // Calculate total spent (for user dashboard)
  const totalSpent = recentOrders.reduce((sum, order) => sum + Number(order.price), 0);
  const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

  // Get recent orders for clients - all orders sorted by date, or orders needing attention for admins
  const recentOrdersList = isAdmin
    ? orders
        .filter(o => o.status === "Sent" || o.status === "Revision")
        .sort((a, b) => new Date(b.dateOrdered).getTime() - new Date(a.dateOrdered).getTime())
        .slice(0, 5)
    : orders
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
      if (!isAdmin) {
        existing.spent = (existing.spent || 0) + Number(order.price);
      }
    } else {
      acc.push({
        month,
        Completed: order.status === "Completed" ? 1 : 0,
        Sent: order.status === "Sent" ? 1 : 0,
        Revision: order.status === "Revision" ? 1 : 0,
        Rejected: order.status === "Rejected" ? 1 : 0,
        ...((!isAdmin) && { spent: Number(order.price) }),
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {welcomeLoading || !welcomeData?.message
              ? `Welcome back, ${user?.firstName || user?.username}!`
              : welcomeData.message}
          </h2>
          <p className="text-muted-foreground mt-2">
            {isAdmin 
              ? "Here's an overview of order fulfillment in the last 30 days"
              : "Here's what's happening with your orders in the last 30 days"
            }
          </p>
        </div>
        <div className="hidden md:block">
          <div className="animated-character-container h-32 w-40 relative">
            {/* Waving Guy Character SVG */}
            <svg 
              viewBox="0 0 400 400" 
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Speech Bubble */}
              <g className="speech-bubble">
                <ellipse 
                  cx="320" 
                  cy="120" 
                  rx="60" 
                  ry="35" 
                  fill="white" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="3"
                />
                <path 
                  d="M270,135 L250,165 L280,130" 
                  fill="white" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="3"
                />
                <text 
                  x="320" 
                  y="128" 
                  fontFamily="Arial" 
                  fontSize="24" 
                  fontWeight="bold"
                  fill="hsl(var(--primary))" 
                  textAnchor="middle"
                >Hi!</text>
              </g>

              {/* Character Head */}
              <circle 
                cx="180" 
                cy="140" 
                r="60" 
                fill="hsl(var(--muted-foreground)/0.3)" 
              />
              
              {/* Character Face */}
              <circle cx="160" cy="130" r="8" fill="black" /> {/* Left eye */}
              <circle cx="200" cy="130" r="8" fill="black" /> {/* Right eye */}
              <path 
                d="M160,160 Q180,180 200,160" 
                stroke="black" 
                strokeWidth="3" 
                fill="transparent"
              /> {/* Smile */}
              
              {/* Character Body */}
              <rect 
                x="140" 
                y="200" 
                width="80" 
                height="100" 
                rx="20" 
                fill="hsl(var(--primary))" 
              />
              
              {/* Character Neck */}
              <rect 
                x="170" 
                y="180" 
                width="20" 
                height="30" 
                fill="hsl(var(--muted-foreground)/0.3)" 
              />
              
              {/* Left Arm (static) */}
              <path 
                d="M140,220 L80,240" 
                stroke="hsl(var(--primary))" 
                strokeWidth="20" 
                strokeLinecap="round"
                fill="transparent"
              />
              
              {/* Right Arm (waving) */}
              <path 
                d="M220,220 L280,180" 
                stroke="hsl(var(--primary))" 
                strokeWidth="20" 
                strokeLinecap="round"
                fill="transparent"
                className="origin-[220px_220px] animate-[wave_1.5s_ease-in-out_infinite]"
              />
              <style>
                {`
                @keyframes wave {
                  0% { transform: rotate(0deg); }
                  25% { transform: rotate(-20deg); }
                  50% { transform: rotate(0deg); }
                  75% { transform: rotate(-20deg); }
                  100% { transform: rotate(0deg); }
                }
                `}
              </style>
              
              {/* Legs */}
              <rect 
                x="150" 
                y="300" 
                width="20" 
                height="60" 
                fill="hsl(var(--muted))" 
              /> {/* Left leg */}
              <rect 
                x="190" 
                y="300" 
                width="20" 
                height="60" 
                fill="hsl(var(--muted))" 
              /> {/* Right leg */}
            </svg>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isAdmin ? (
          <>
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
                <CardTitle className="text-sm font-medium">Orders in Revision</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{revisionOrders}</div>
                <p className="text-xs text-muted-foreground">
                  Under revision
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
          </>
        ) : (
          <>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <p className="text-xs text-muted-foreground">
                  {completedOrders} completed
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
                  Avg ${averageOrderValue.toFixed(2)} per order
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingOrders + revisionOrders}</div>
                <p className="text-xs text-muted-foreground">
                  In progress
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
                  {completionRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Order completion rate
                </p>
              </CardContent>
            </Card>
          </>
        )}
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
                {isAdmin ? (
                  <>
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
                      dataKey="Revision"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="Rejected"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                    />
                  </>
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="spent"
                      name="Amount Spent"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                  </>
                )}
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow md:col-span-2">
          <CardHeader>
            <CardTitle>{isAdmin ? "Orders Needing Attention" : "Recent Orders"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrdersList.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div>
                    <p className="font-medium">{order.sourceUrl}</p>
                    {isAdmin && (
                      <p className="text-sm text-muted-foreground">
                        Ordered by: {order.user?.companyName || order.user?.username}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Status: {order.status}
                    </p>
                  </div>
                  <Link href={`/orders/${order.id}`}>
                    <button className="text-blue-600 hover:underline text-sm">
                      View Details →
                    </button>
                  </Link>
                </div>
              ))}
              {recentOrdersList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isAdmin ? "No orders needing attention" : "No orders yet"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}