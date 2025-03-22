import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AuthDebugPage() {
  const { user, isLoading, loginMutation, logoutMutation } = useAuth();
  const [username, setUsername] = useState("saket");
  const [password, setPassword] = useState("password");
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Check auth status
  const checkAuthStatus = async () => {
    try {
      setApiError(null);
      const res = await fetch("/api/auth-status", {
        credentials: "include",
      });
      const data = await res.json();
      setAuthStatus(data);
    } catch (error) {
      console.error("Error checking auth status:", error);
      setApiError(String(error));
    }
  };

  const login = () => {
    setApiError(null);
    loginMutation.mutate({ username, password });
  };

  const logout = () => {
    setApiError(null);
    logoutMutation.mutate();
  };

  // Test API request
  const testOrdersApi = async () => {
    try {
      setApiError(null);
      const res = await apiRequest("/api/orders");
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`${res.status}: ${errorText || res.statusText}`);
      }
      const data = await res.json();
      console.log("Orders API response:", data);
      alert(`Successfully retrieved ${data.length} orders`);
    } catch (error) {
      console.error("Error testing orders API:", error);
      setApiError(String(error));
    }
  };
  
  // Test invoices API
  const testInvoicesApi = async () => {
    try {
      setApiError(null);
      const res = await apiRequest("/api/invoices");
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`${res.status}: ${errorText || res.statusText}`);
      }
      const data = await res.json();
      console.log("Invoices API response:", data);
      alert(`Successfully retrieved ${data.length} invoices`);
    } catch (error) {
      console.error("Error testing invoices API:", error);
      setApiError(String(error));
    }
  };

  // Load auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [user]);

  return (
    <DashboardShell>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>

        {apiError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>API Error</AlertTitle>
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Status</CardTitle>
              <CardDescription>Current user authentication state</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">useAuth Hook Status:</h3>
                  <pre className="bg-secondary p-2 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify({ user, isLoading }, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Server Auth Status:</h3>
                  <pre className="bg-secondary p-2 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify(authStatus, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={checkAuthStatus}>Refresh Auth Status</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentication Actions</CardTitle>
              <CardDescription>Test login and logout functionality</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button onClick={login} disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
              <Button 
                onClick={logout} 
                disabled={logoutMutation.isPending} 
                variant="outline"
              >
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Tests</CardTitle>
              <CardDescription>Test data-related API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={testOrdersApi} 
                  variant="outline" 
                  className="w-full"
                >
                  Test Orders API
                </Button>
                <Button 
                  onClick={testInvoicesApi} 
                  variant="outline" 
                  className="w-full"
                >
                  Test Invoices API
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}