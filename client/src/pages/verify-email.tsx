import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  // Parse token from URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setStatus("error");
        setMessage("No verification token found in URL.");
        return;
      }

      try {
        // We can verify regardless of login status with the public endpoint
        // But store the token in case we need it later
        if (!user) {
          localStorage.setItem("pendingVerificationToken", token);
        }

        // Submit the token to verify email - use the auth endpoint
        const res = await apiRequest("POST", "/api/auth/verify-email", { token });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Verification failed");
        }

        const data = await res.json();
        setStatus("success");
        setMessage(data.message || "Your email has been verified successfully!");
        
        // Refresh the user data to update the verification status
        await refreshUser();
        
        toast({
          title: "Email Verified",
          description: "Your email has been successfully verified.",
        });
      } catch (error) {
        console.error("Email verification error:", error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Failed to verify email");
        
        toast({
          title: "Verification Failed",
          description: error instanceof Error ? error.message : "Failed to verify email",
          variant: "destructive",
        });
      }
    }

    verifyEmail();
  }, [token, user, refreshUser, toast]);

  // If user is logged in but the token was saved from a previous attempt
  useEffect(() => {
    const pendingToken = localStorage.getItem("pendingVerificationToken");
    if (user && pendingToken) {
      // Clear the pending token
      localStorage.removeItem("pendingVerificationToken");
      // Redirect to the verification page with the token
      window.location.href = `/verify-email?token=${pendingToken}`;
    }
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-bold tracking-tight">Email Verification</h1>
          
          <div className="mt-6 flex flex-col items-center justify-center">
            {status === "loading" && (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="mt-4 text-lg">Verifying your email address...</p>
              </>
            )}
            
            {status === "success" && (
              <>
                <CheckCircle className="h-16 w-16 text-green-500" />
                <p className="mt-4 text-lg">{message}</p>
                <Button 
                  className="mt-6 bg-primary text-black"
                  onClick={() => navigate("/profile")}
                >
                  Go to Profile
                </Button>
              </>
            )}
            
            {status === "error" && (
              <>
                <AlertTriangle className="h-16 w-16 text-amber-500" />
                <p className="mt-4 text-lg">{message}</p>
                {!user ? (
                  <Button 
                    className="mt-6 bg-primary text-black"
                    onClick={() => navigate("/login")}
                  >
                    Login
                  </Button>
                ) : (
                  <Button 
                    className="mt-6 bg-primary text-black"
                    onClick={() => navigate("/profile")}
                  >
                    Go to Profile
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}