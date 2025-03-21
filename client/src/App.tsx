import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "./pages/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/lib/protected-route";
import Dashboard from "./pages/dashboard";
import DomainsPage from "./pages/domains";
import OrdersPage from "./pages/orders";
import OrderDetailsPage from "./pages/orders/[id]";
import NewOrderPage from "./pages/orders/new";
import ProfilePage from "./pages/profile";
import UsersPage from "./pages/users";
import ChatPage from "./pages/chat";
import ReportsPage from "./pages/reports";
import KanbanPage from "./pages/kanban";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/domains">
          <ProtectedRoute>
            <DashboardShell>
              <DomainsPage />
            </DashboardShell>
          </ProtectedRoute>
        </Route>
        <Route path="/orders/new">
          <ProtectedRoute>
            <DashboardShell>
              <NewOrderPage />
            </DashboardShell>
          </ProtectedRoute>
        </Route>
        <Route path="/orders/:id">
          <ProtectedRoute>
            <DashboardShell>
              <OrderDetailsPage />
            </DashboardShell>
          </ProtectedRoute>
        </Route>
        <Route path="/orders">
          <ProtectedRoute>
            <DashboardShell>
              <OrdersPage />
            </DashboardShell>
          </ProtectedRoute>
        </Route>
        <Route path="/chat">
          <ProtectedRoute>
            <DashboardShell>
              <ChatPage />
            </DashboardShell>
          </ProtectedRoute>
        </Route>
        <Route path="/users">
          <ProtectedRoute>
            <DashboardShell>
              <UsersPage />
            </DashboardShell>
          </ProtectedRoute>
        </Route>
        <Route path="/profile">
          <ProtectedRoute>
            <DashboardShell>
              <ProfilePage />
            </DashboardShell>
          </ProtectedRoute>
        </Route>
        <Route path="/reports">
          <ProtectedRoute>
            <DashboardShell>
              <ReportsPage />
            </DashboardShell>
          </ProtectedRoute>
        </Route>
        <Route path="/kanban">
          <ProtectedRoute>
            <DashboardShell>
              <KanbanPage />
            </DashboardShell>
          </ProtectedRoute>
        </Route>
        <Route path="/">
          <ProtectedRoute>
            <DashboardShell>
              <Dashboard />
            </DashboardShell>
          </ProtectedRoute>
        </Route>
      </Switch>
      <Toaster />
    </div>
  );
}

export default App;