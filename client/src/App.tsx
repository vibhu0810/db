import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "./pages/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/lib/protected-route";
import DomainsPage from "./pages/domains";
import OrdersPage from "./pages/orders";
import NewOrderPage from "./pages/orders/new";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <ProtectedRoute path="/domains">
              <DomainsPage />
            </ProtectedRoute>
            <ProtectedRoute path="/orders">
              <OrdersPage />
            </ProtectedRoute>
            <ProtectedRoute path="/orders/new">
              <NewOrderPage />
            </ProtectedRoute>
            <ProtectedRoute path="/">
              <DashboardShell>
                <h1>Welcome to your dashboard</h1>
              </DashboardShell>
            </ProtectedRoute>
          </Switch>
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;