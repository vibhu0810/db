import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe2, BarChart2, LinkIcon } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      companyName: "",
      country: "",
      bio: "",
    },
  });

  if (user) {
    window.location.href = "/";
    return null;
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to LinkManager</CardTitle>
            <CardDescription>
              Manage your backlinks efficiently and track performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="animate-in fade-in-50 duration-500">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="login" className="text-lg">Login</TabsTrigger>
                <TabsTrigger value="register" className="text-lg">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 animate-in slide-in-from-left duration-500">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit((data) =>
                      loginMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="transition-all duration-200 focus:scale-[1.02]"
                              autoComplete="username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              {...field} 
                              className="transition-all duration-200 focus:scale-[1.02]"
                              autoComplete="current-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Login
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 animate-in slide-in-from-right duration-500">
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit((data) =>
                      registerMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="transition-all duration-200 focus:scale-[1.02]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="transition-all duration-200 focus:scale-[1.02]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="transition-all duration-200 focus:scale-[1.02]"
                              autoComplete="username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              {...field} 
                              className="transition-all duration-200 focus:scale-[1.02]"
                              autoComplete="email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              {...field} 
                              className="transition-all duration-200 focus:scale-[1.02]"
                              autoComplete="new-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="transition-all duration-200 focus:scale-[1.02]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="transition-all duration-200 focus:scale-[1.02]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Register
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <div className="hidden lg:flex flex-1 bg-muted items-center justify-center p-8">
        <div className="max-w-md space-y-8">
          <h2 className="text-2xl font-bold mb-4">
            Transform Your Link Building Strategy
          </h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4 hover:translate-x-2 transition-transform duration-300">
              <div className="mt-1">
                <Globe2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Global Reach</h3>
                <p className="text-muted-foreground">
                  Access a curated network of high-authority domains across various niches
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 hover:translate-x-2 transition-transform duration-300">
              <div className="mt-1">
                <BarChart2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Performance Analytics</h3>
                <p className="text-muted-foreground">
                  Track your link building success with comprehensive analytics and insights
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 hover:translate-x-2 transition-transform duration-300">
              <div className="mt-1">
                <LinkIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Smart Link Management</h3>
                <p className="text-muted-foreground">
                  Efficiently manage your backlinks with our intuitive dashboard and tools
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}