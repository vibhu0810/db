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
import InvoicesPage from "./pages/invoices";
import FeedbackPage from "./pages/feedback";
import VerifyEmailPage from "./pages/verify-email";
import AuthDebugPage from "./pages/debug/auth";
import AdminTicketTools from "./pages/admin/ticket-tools";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/login" component={AuthPage} />
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
        {/* Special route for direct ticket access */}
        <Route path="/chat/ticket/:id">
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
        <Route path="/invoices">
          <ProtectedRoute>
            <DashboardShell>
              <InvoicesPage />
            </DashboardShell>
          </ProtectedRoute>
        </Route>
        <Route path="/feedback">
          <ProtectedRoute>
            <FeedbackPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/ticket-tools">
          <ProtectedRoute>
            <AdminTicketTools />
          </ProtectedRoute>
        </Route>
        <Route path="/debug/auth">
          <AuthDebugPage />
        </Route>
        <Route path="/verify-email">
          <VerifyEmailPage />
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