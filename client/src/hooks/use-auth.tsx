import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

const defaultContext: AuthContextType = {
  user: null,
  isLoading: true,
  error: null,
  loginMutation: {} as UseMutationResult<SelectUser, Error, LoginData>,
  logoutMutation: {} as UseMutationResult<void, Error, void>,
  registerMutation: {} as UseMutationResult<SelectUser, Error, InsertUser>,
  isAdmin: false,
  refreshUser: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const refreshUser = async () => {
    await refetch();
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Login attempt for:", credentials.username);
      const res = await apiRequest("/api/login", credentials);
      
      if (!res.ok) {
        let errorText;
        try {
          errorText = await res.text();
        } catch (e) {
          console.error("Error parsing error response:", e);
          errorText = "Failed to parse error response";
        }
        throw new Error(errorText || res.statusText || "Login failed");
      }
      
      console.log("Login response status:", res.status);
      
      try {
        const userData = await res.json();
        console.log("Login successful, user data received:", !!userData);
        return userData;
      } catch (error) {
        console.error("Error parsing JSON response:", error);
        throw new Error("Invalid response format from server. Please try again.");
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Login mutation success, updating auth state with user:", user.username);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error.message);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      console.log("Register attempt for:", credentials.username);
      const res = await apiRequest("/api/register", credentials);
      
      if (!res.ok) {
        let errorText;
        try {
          errorText = await res.text();
        } catch (e) {
          console.error("Error parsing error response:", e);
          errorText = "Failed to parse error response";
        }
        throw new Error(errorText || res.statusText || "Registration failed");
      }
      
      console.log("Register response status:", res.status);
      
      try {
        const userData = await res.json();
        console.log("Registration successful, user data received:", !!userData);
        return userData;
      } catch (error) {
        console.error("Error parsing JSON response:", error);
        throw new Error("Invalid response format from server. Please try again.");
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Registration mutation success, updating auth state with user:", user.username);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.username}! Your account has been created.`,
      });
    },
    onError: (error: Error) => {
      console.error("Registration mutation error:", error.message);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Attempting logout");
      const res = await apiRequest("/api/logout", {}); // Empty object will make it a POST request
      
      if (!res.ok) {
        let errorText;
        try {
          errorText = await res.text();
        } catch (e) {
          console.error("Error parsing error response:", e);
          errorText = "Failed to parse error response";
        }
        throw new Error(errorText || res.statusText || "Logout failed");
      }
      
      console.log("Logout successful, status:", res.status);
      return;
    },
    onSuccess: () => {
      console.log("Logout mutation success, clearing user data");
      queryClient.setQueryData(["/api/user"], null);
      // Invalidate all queries to force refetching after logout
      queryClient.invalidateQueries();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      console.error("Logout mutation error:", error.message);
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isAdmin = user?.is_admin ?? false;

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        isAdmin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { AuthContext };