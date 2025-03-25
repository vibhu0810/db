import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

interface PasswordResetRequestResponse {
  success: boolean;
  message: string;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const resetRequestMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/password-reset-request", { email });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to send password reset email");
      }
      const data = await response.json();
      return data as PasswordResetRequestResponse;
    },
    onSuccess: () => {
      setRequestSent(true);
      setRequestError(null);
    },
    onError: (error: Error) => {
      setRequestError(error.message);
      setRequestSent(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setRequestError("Please enter your email address");
      return;
    }
    resetRequestMutation.mutate(email);
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
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground animate-in fade-in-50 duration-700 text-center">
            {!requestSent 
              ? "Enter your email address to receive a password reset link"
              : "Check your email for the reset link"
            }
          </p>
        </CardHeader>
        <CardContent>
          {requestSent ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-muted/50 rounded-lg">
                <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                <p className="text-center">
                  A password reset link has been sent to <strong>{email}</strong>.
                  Please check your email and follow the instructions to reset your password.
                </p>
              </div>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setRequestSent(false)}
                  className="mr-2"
                >
                  Try another email
                </Button>
                <Link href="/auth">
                  <Button>
                    Return to sign in
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {requestError && (
                <Alert variant="destructive" className="animate-in fade-in-50 duration-300">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{requestError}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="transition-all duration-200 focus:scale-[1.02]"
                  placeholder="Enter your verified email"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We'll send a password reset link to this email
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                disabled={resetRequestMutation.isPending}
              >
                {resetRequestMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Send Reset Link
              </Button>
              
              <div className="mt-4 text-center">
                <Link href="/auth">
                  <Button variant="link" className="text-sm">
                    <ArrowLeft className="mr-1 h-4 w-4" />
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