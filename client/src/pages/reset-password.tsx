import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, CheckCircle, AlertTriangle } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export default function ResetPasswordPage() {
  const [location] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    // Extract token from URL using a simpler approach
    try {
      console.log("Current location:", location);
      
      // Simplify: Just use URLSearchParams with window.location.search
      const searchParams = new URLSearchParams(window.location.search);
      const tokenFromSearch = searchParams.get('token');
      console.log("Token from URL search params:", tokenFromSearch);
      
      if (tokenFromSearch) {
        console.log("Found token in URL, setting token state:", tokenFromSearch);
        setToken(tokenFromSearch);
      } else {
        console.error("No token found in URL parameters");
        setResetError("No reset token found in URL");
      }
    } catch (error) {
      console.error("Error parsing URL for token:", error);
      setResetError("Failed to parse reset token from URL");
    }
  }, [location]);

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ password, confirmPassword, token }: { password: string; confirmPassword: string; token: string }) => {
      console.log("Sending reset password request with token:", token);
      if (!token) {
        throw new Error("Reset token is missing");
      }
      
      const response = await apiRequest("POST", "/api/auth/reset-password", {
        password, 
        confirmPassword,
        token
      });
      
      let data;
      try {
        const text = await response.text();
        console.log("Reset password response text:", text);
        data = text.length ? JSON.parse(text) : {};
      } catch (error) {
        console.error("JSON parse error:", error);
        throw new Error("Failed to parse server response");
      }
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }
      
      return data as PasswordResetResponse;
    },
    onSuccess: (data) => {
      console.log("Password reset successful:", data);
      setResetSuccess(true);
      setResetError(null);
      setPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      console.error("Password reset error:", error.message);
      setResetError(error.message);
      setResetSuccess(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate the form
    if (password.length < 8) {
      setResetError("Password must be at least 8 characters long");
      return;
    }
    
    if (password !== confirmPassword) {
      setResetError("Passwords do not match");
      return;
    }
    
    if (!token) {
      setResetError("Reset token is missing or invalid");
      return;
    }
    
    console.log("Submitting reset password form with data:", { 
      password: password.substring(0, 1) + "*****", 
      confirmPassword: confirmPassword.substring(0, 1) + "*****", 
      token, 
      tokenLength: token.length 
    });
    
    resetPasswordMutation.mutate({ password, confirmPassword, token });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
      </div>

      <Card className="w-full max-w-sm relative hover:shadow-xl transition-all duration-500">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2 animate-in fade-in-50 duration-700">
            <Logo size="lg" showText={true} showProduct={false} />
          </div>
          <h1 className="text-2xl font-bold animate-in slide-in-from-top duration-500 text-center">
            {resetSuccess ? "Password Reset" : "Create New Password"}
          </h1>
          <p className="text-sm text-muted-foreground animate-in fade-in-50 duration-700 text-center">
            {!token && !resetSuccess ? "Invalid or expired reset link" : 
             resetSuccess ? "Your password has been updated" :
             "Enter your new password below"}
          </p>
        </CardHeader>
        <CardContent>
          {!token && !resetSuccess ? (
            <div className="space-y-4">
              <Alert variant="destructive" className="animate-in fade-in-50 duration-300">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>This password reset link is invalid or has expired.</AlertDescription>
              </Alert>
              <div className="flex justify-center">
                <Link href="/forgot-password">
                  <Button>
                    Request new reset link
                  </Button>
                </Link>
              </div>
            </div>
          ) : resetSuccess ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-muted/50 rounded-lg">
                <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                <p className="text-center">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
              </div>
              <div className="flex justify-center">
                <Link href="/auth">
                  <Button>
                    Go to sign in
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {resetError && (
                <Alert variant="destructive" className="animate-in fade-in-50 duration-300">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{resetError}</AlertDescription>
                </Alert>
              )}
              
              {/* Token debugging - only show in development */}
              {import.meta.env.DEV && token && (
                <div className="p-2 mt-1 text-xs border border-dashed border-muted rounded">
                  <p><strong>Debug:</strong> Token detected ({token.length} chars):</p>
                  <code className="block p-1 mt-1 bg-muted overflow-auto text-[10px]">{token}</code>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="transition-all duration-200 focus:scale-[1.02] pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Password must be at least 8 characters
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="transition-all duration-200 focus:scale-[1.02] pr-10"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Reset Password
              </Button>
              
              <div className="mt-4 text-center">
                <Link href="/auth">
                  <Button variant="link" className="text-sm">
                    Back to sign in
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}