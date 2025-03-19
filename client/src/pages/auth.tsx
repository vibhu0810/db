import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Redirect } from "wouter";
import { useSEOJoke } from "@/hooks/use-seo-joke";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayText, setDisplayText] = useState("");
  const fullText = "Welcome to LinkManager!";
  const { data: seoJokeData, refetch: fetchJoke } = useSEOJoke();

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 100);

    fetchJoke();

    return () => clearInterval(timer);
  }, []);

  // If user is already logged in, redirect to home
  if (user) {
    return <Redirect to="/" />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-2xl font-bold animate-in slide-in-from-top duration-500">
            {displayText}
            <span className="animate-pulse">|</span>
          </h1>
          <p className="text-sm text-muted-foreground animate-in fade-in-50 duration-700 delay-500">
            Sign in to scale your link building
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="username">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sign in
            </Button>
          </form>

          {seoJokeData?.data?.joke && (
            <div className="mt-6 p-4 bg-muted rounded-lg border animate-in fade-in-50 duration-700 delay-1000">
              <p className="text-sm text-muted-foreground italic">
                "{seoJokeData.data.joke}"
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}