import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "./pages/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/lib/protected-route";
import Dashboard from "./pages/dashboard";
import DomainsPage from "./pages/domains";
import OrdersPage from "./pages/orders";
import NewOrderPage from "./pages/orders/new";
import ProfilePage from "./pages/profile";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <ProtectedRoute path="/domains">
              <DashboardShell>
                <DomainsPage />
              </DashboardShell>
            </ProtectedRoute>
            <ProtectedRoute path="/orders">
              <DashboardShell>
                <OrdersPage />
              </DashboardShell>
            </ProtectedRoute>
            <ProtectedRoute path="/orders/new">
              <DashboardShell>
                <NewOrderPage />
              </DashboardShell>
            </ProtectedRoute>
            <ProtectedRoute path="/profile">
              <DashboardShell>
                <ProfilePage />
              </DashboardShell>
            </ProtectedRoute>
            <ProtectedRoute path="/">
              <DashboardShell>
                <Dashboard />
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