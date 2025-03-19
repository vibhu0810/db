import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Domain, InsertOrder } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { z } from "zod";

type OrderType = "guest_post" | "niche_edit";

// Helper functions remain the same...
const getTurnaroundTime = (domain: Domain, orderType: OrderType | null) => {
  if (domain.websiteUrl === "engagebay.com") {
    return "3 working days";
  } else if (domain.websiteUrl === "blog.powr.io") {
    if (orderType === "guest_post" || domain.type === "guest_post") {
      return "10 working days post content approval";
    } else {
      return "3 working days";
    }
  }
  return "7-14 business days";
};

const getContentWritingPrice = (domain: Domain) => {
  if (domain.websiteUrl === "blog.powr.io") {
    return 80;
  }
  return 0;
};

export default function NewOrder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const domainId = searchParams.get("domain");
  const [selectedType, setSelectedType] = useState<OrderType | null>(null);
  const [weWriteContent, setWeWriteContent] = useState(false);

  const { data: domain, isLoading: isDomainLoading } = useQuery<Domain>({
    queryKey: [`/api/domains/${domainId}`],
    enabled: !!domainId,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (formData: InsertOrder) => {
      if (!domain) throw new Error("Domain not found");
      console.log("Form data being submitted:", formData);

      const orderData = {
        ...formData,
        type: selectedType || domain.type,
        domainId: domain.id,
        weWriteContent,
        price: selectedType === "guest_post" ? domain.guestPostPrice : domain.nicheEditPrice,
        status: "Sent",
        dateOrdered: new Date().toISOString(),
      };

      console.log("Processed order data:", orderData);
      const res = await apiRequest("POST", "/api/orders", orderData);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create order");
      }
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
      console.error("Order creation error:", error);
      toast({
        title: "Error creating order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formValidationSchema = insertOrderSchema.extend({
    sourceUrl: z.string().min(1, "Source URL is required").refine(
      (url) => {
        if (!domain || selectedType === "guest_post") return true;
        try {
          const urlObj = new URL(url);
          return urlObj.hostname.includes(domain.websiteUrl);
        } catch {
          return false;
        }
      },
      {
        message: `Link URL must be from ${domain?.websiteUrl}`,
      }
    ),
    targetUrl: z.string().min(1, "Target URL is required").url("Please enter a valid URL"),
    anchorText: z.string().min(1, "Anchor text is required"),
    title: z.string().optional(),
    textEdit: z.string().optional(),
    content: weWriteContent ? z.string().optional() : z.string().url("Please enter a valid content URL"),
  });

  const form = useForm<InsertOrder>({
    resolver: zodResolver(formValidationSchema),
    defaultValues: {
      sourceUrl: "",
      targetUrl: "",
      anchorText: "",
      textEdit: "",
      notes: "",
      title: "",
      dateOrdered: new Date().toISOString(),
      status: "Sent",
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.handleSubmit((data) => {
      console.log("Form values:", data);
      console.log("Form state:", form.formState);
      createOrderMutation.mutate(data);
    })(e);
  };

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

  const showTypeSelection = domain.type === "both" && !selectedType;
  const isNicheEdit = selectedType === "niche_edit" || domain.type === "niche_edit";
  const isGuestPost = selectedType === "guest_post" || domain.type === "guest_post";
  const price = isGuestPost ? domain.guestPostPrice : domain.nicheEditPrice;
  const contentWritingPrice = getContentWritingPrice(domain);
  const turnaroundTime = getTurnaroundTime(domain, selectedType);

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
              Create a new order for {domain.websiteName}
              {price && (
                <div className="mt-2 text-lg font-semibold">
                  Price: ${price}
                  {isGuestPost && weWriteContent && contentWritingPrice > 0 && (
                    <span> + ${contentWritingPrice} (content writing)</span>
                  )}
                </div>
              )}
            </CardDescription>
            <div className="mt-2 text-sm text-muted-foreground">
              * Estimated turnaround time: {turnaroundTime}. This is not a guaranteed timeframe for the {isNicheEdit ? "Niche Edit" : "Guest Post"} to go live.
              It is based on previous requests we made live on this domain.
            </div>
          </CardHeader>
          <CardContent>
            {showTypeSelection ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Select Order Type</h3>
                <RadioGroup
                  onValueChange={(value) => setSelectedType(value as OrderType)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="guest_post" id="guest_post" />
                    <label htmlFor="guest_post">
                      Guest Post (${domain.guestPostPrice})
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="niche_edit" id="niche_edit" />
                    <label htmlFor="niche_edit">
                      Niche Edit (${domain.nicheEditPrice})
                    </label>
                  </div>
                </RadioGroup>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {isGuestPost && (
                    <>
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Post Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              Enter the title for your guest post
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {contentWritingPrice > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Content Source</h3>
                          <RadioGroup
                            value={weWriteContent ? "we_write" : "user_provides"}
                            onValueChange={(value) =>
                              setWeWriteContent(value === "we_write")
                            }
                            className="space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="user_provides"
                                id="user_provides"
                              />
                              <label htmlFor="user_provides">
                                I'll provide the content (URL)
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="we_write" id="we_write" />
                              <label htmlFor="we_write">
                                Write the content for me (${contentWritingPrice} for
                                1000 words)
                              </label>
                            </div>
                          </RadioGroup>
                        </div>
                      )}

                      {!weWriteContent && (
                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content URL</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="url"
                                  placeholder="https://docs.google.com/document/d/..."
                                />
                              </FormControl>
                              <FormDescription>
                                Provide a URL to your content (e.g., Google Docs,
                                Dropbox)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}

                  {isNicheEdit && (
                    <FormField
                      control={form.control}
                      name="sourceUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link from URL</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={`https://${domain.websiteUrl}/blog/example`}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter the URL of the existing article where you want to
                            add your link (must be from {domain.websiteUrl})
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
                        <FormLabel>Link to URL</FormLabel>
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

                  {isNicheEdit && (
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
                            Provide instructions for how you want the link to be
                            added
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

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
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}