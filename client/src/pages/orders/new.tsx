import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Domain } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function NewOrder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const domainId = searchParams.get("domain");

  const { data: domain, isLoading: isDomainLoading } = useQuery<Domain>({
    queryKey: [`/api/domains/${domainId}`],
    enabled: !!domainId,
  });

  const form = useForm({
    resolver: zodResolver(
      insertOrderSchema.extend({
        title: domain?.type === "guest_post" 
          ? insertOrderSchema.shape.title
          : insertOrderSchema.shape.title.optional(),
        linkUrl: domain?.type === "niche_edit"
          ? insertOrderSchema.shape.sourceUrl
          : insertOrderSchema.shape.sourceUrl.optional(),
      })
    ),
    defaultValues: {
      sourceUrl: domain?.websiteUrl || "",
      targetUrl: "",
      anchorText: "",
      textEdit: "",
      notes: "",
      domainAuthority: domain?.domainAuthority || null,
      domainRating: domain?.domainRating || null,
      websiteTraffic: domain?.websiteTraffic || null,
      pageTraffic: null,
      price: domain?.price || 0,
      status: "Pending",
      dateOrdered: new Date().toISOString(),
      title: "", // For guest posts
      linkUrl: "", // For niche edits
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      // Process form data based on domain type
      const orderData = {
        ...data,
        // For guest posts, use the domain's website URL as source
        // For niche edits, use the provided link URL as source
        sourceUrl: domain?.type === "guest_post" ? domain.websiteUrl : data.linkUrl,
        // Carry over domain metadata
        domainAuthority: domain?.domainAuthority,
        domainRating: domain?.domainRating,
        websiteTraffic: domain?.websiteTraffic,
        price: domain?.price,
      };
      const res = await apiRequest("POST", "/api/orders", orderData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order created",
        description: "Your order has been successfully created.",
      });
      setLocation("/orders");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isDomainLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </DashboardShell>
    );
  }

  if (!domain) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-full">
          <p>Domain not found</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">New Order</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>
              Create a new {domain.type === "guest_post" ? "guest post" : "niche edit"} order for {domain.websiteName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) =>
                  createOrderMutation.mutate(data)
                )}
                className="space-y-4"
              >
                {domain.type === "guest_post" ? (
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Post Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter your guest post title" />
                        </FormControl>
                        <FormDescription>
                          The title of your guest post article
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="linkUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Existing Article URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com/article" />
                        </FormControl>
                        <FormDescription>
                          The URL of the existing article where you want to add your link
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="targetUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        The URL you want to link to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="anchorText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anchor Text</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        The text that will be linked
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="textEdit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text Edit Instructions</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormDescription>
                        Any specific instructions for text placement
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormDescription>
                        Any additional requirements or notes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/domains")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Order
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}