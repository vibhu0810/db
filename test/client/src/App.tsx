import React from 'react';
import { Route, Switch } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../../client/src/lib/queryClient';
import { Toaster } from '../../../client/src/components/ui/toaster';

// Auth Pages
import LoginPage from './pages/login';
import RegisterPage from './pages/register';

// Dashboard Pages
import UserDashboard from './pages/dashboard';
import AdminDashboard from './pages/admin/dashboard';
import ManagerDashboard from './pages/manager/dashboard';
import InventoryDashboard from './pages/inventory/dashboard';

// Admin Features
import FeedbackDashboard from './pages/admin/feedback';

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // This would normally check authentication status
  // For now, we'll assume the user is authenticated in the test environment
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        {/* Auth Routes */}
        <Route path="/test/login">
          <LoginPage />
        </Route>
        <Route path="/test/register">
          <RegisterPage />
        </Route>
        
        {/* Admin Routes */}
        <Route path="/test/admin/dashboard">
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/test/admin/feedback">
          <ProtectedRoute>
            <FeedbackDashboard />
          </ProtectedRoute>
        </Route>
        
        {/* User Manager Routes */}
        <Route path="/test/manager/dashboard">
          <ProtectedRoute>
            <ManagerDashboard />
          </ProtectedRoute>
        </Route>
        
        {/* Inventory Manager Routes */}
        <Route path="/test/inventory/dashboard">
          <ProtectedRoute>
            <InventoryDashboard />
          </ProtectedRoute>
        </Route>
        
        {/* Regular User Routes */}
        <Route path="/test/dashboard">
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        </Route>
        
        {/* Default Route - Redirect to login */}
        <Route path="/test">
          <LoginPage />
        </Route>
      </Switch>
      
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;