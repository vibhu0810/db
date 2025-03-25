import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Redirect } from "wouter";
import { useSEOJoke } from "@/hooks/use-seo-joke";
import { Logo } from "@/components/ui/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [showAltText, setShowAltText] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const fullText = "Welcome to SaaSxLinks!";
  const { data: seoJokeData, refetch: fetchJoke } = useSEOJoke();

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
        // Hide cursor after animation
        setShowCursor(false);
      }
    }, 100);

    fetchJoke();

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const textTimer = setInterval(() => {
      setShowAltText(prev => !prev);
    }, 3000);

    return () => clearInterval(textTimer);
  }, []);
  
  // Handle login errors
  useEffect(() => {
    if (loginMutation.error) {
      setLoginError(loginMutation.error.message);
    } else {
      setLoginError(null);
    }
  }, [loginMutation.error]);

  // If user is already logged in, redirect to home
  if (user) {
    return <Redirect to="/" />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
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
        <CardHeader className="space-y-4">
          <div className="flex justify-center mb-2 animate-in fade-in-50 duration-700">
            <Logo size="lg" showText={true} showProduct={false} />
          </div>
          <h1 className="text-2xl font-bold animate-in slide-in-from-top duration-500 text-center">
            {displayText}
            {showCursor && <span className="animate-pulse">|</span>}
          </h1>
          <p className="text-sm text-muted-foreground animate-in fade-in-50 duration-700 delay-500 text-center">
            Sign in to {" "}
            <span className={showAltText ? "" : "line-through"}>
              {showAltText ? "slay your competitors" : "scale your link building"}
            </span>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginError && (
              <Alert variant="destructive" className="animate-in fade-in-50 duration-300">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="username">
                Username or Email
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="transition-all duration-200 focus:scale-[1.02]"
                placeholder="Enter username or verified email"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can log in with your verified email address
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="transition-all duration-200 focus:scale-[1.02] pr-10"
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
            </div>
            <Button 
              type="submit" 
              className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-primary text-black hover:bg-primary/90 font-semibold"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sign in
            </Button>
            
            <div className="mt-4 text-center">
              <a href="/forgot-password">
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm text-primary hover:text-primary/80"
                >
                  Forgot password?
                </Button>
              </a>
            </div>
          </form>

          {seoJokeData && seoJokeData.joke && (
            <div className="mt-6 p-4 bg-muted rounded-lg border animate-in fade-in-50 duration-700 delay-1000">
              <p className="text-sm text-muted-foreground italic">
                "{seoJokeData.joke}"
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}