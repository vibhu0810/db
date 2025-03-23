import { useMutation } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

function extractDomainFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.startsWith('www.') ? hostname.substring(4) : hostname;
  } catch (e) {
    return url;
  }
}

interface CustomOrderFormData {
  userId: number;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  textEdit: string;
  notes: string;
  price: number;
}

export default function NewOrderPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [initializing, setInitializing] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);
  
  // Get domain from URL query parameter
  const query = new URLSearchParams(window.location.search);
  const domainId = query.get('domain');

  // Fetch all domains
  const { data: domains = [] } = useQuery({
    queryKey: ['/api/domains'],
    queryFn: () => apiRequest("GET", `/api/domains`).then(res => res.json()),
  });

  // Find the selected domain based on the domain ID from the URL
  useEffect(() => {
    if (domains.length > 0 && domainId) {
      const domain = domains.find((d: any) => d.id.toString() === domainId);
      if (domain) {
        setSelectedDomain(domain);
        
        // Set default values for the form based on domain type
        if (domain.type === 'guest_post' || domain.type === 'both') {
          customOrderForm.setValue('sourceUrl', 'not_applicable');
          customOrderForm.setValue('price', domain.guestPostPrice ? parseFloat(domain.guestPostPrice) : 0);
        } else if (domain.type === 'niche_edit') {
          customOrderForm.setValue('price', domain.nicheEditPrice ? parseFloat(domain.nicheEditPrice) : 0);
        }
      }
      setInitializing(false);
    } else if (domains.length > 0) {
      setInitializing(false);
    }
  }, [domains, domainId]);

  // Create schema for the custom order form
  const customOrderSchema = z.object({
    userId: z.number().int().positive(),
    sourceUrl: z.string().min(1, "Source URL is required"),
    targetUrl: z.string().url("Please enter a valid URL"),
    anchorText: z.string().min(1, "Anchor text is required"),
    textEdit: z.string().optional(),
    notes: z.string().optional(),
    price: z.union([z.string(), z.number()]),
  });

  // Initialize the form
  const customOrderForm = useForm<CustomOrderFormData>({
    resolver: zodResolver(customOrderSchema),
    defaultValues: {
      userId: user?.id || 0,
      sourceUrl: "",
      targetUrl: "",
      anchorText: "",
      textEdit: "",
      notes: "",
      price: 0,
    },
    mode: "onTouched", // Only validate fields after they've been touched
  });

  // API mutation to create a new order
  const customOrderMutation = useMutation({
    mutationFn: async (data: CustomOrderFormData) => {
      const payload: any = {
        ...data,
        price: typeof data.price === "string" ? parseFloat(data.price) : data.price,
      };
      
      // Add domain-specific fields for guest posts
      if (selectedDomain && (selectedDomain.type === 'guest_post' || 
          (selectedDomain.type === 'both' && data.sourceUrl === 'not_applicable'))) {
        payload.title = customOrderForm.getValues('textEdit') || "Guest Post";
        payload.website = {
          name: selectedDomain.websiteName,
          url: selectedDomain.websiteUrl
        };
      }
      
      const res = await apiRequest("POST", "/api/orders", payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create order");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order created",
        description: `Order #${data.id} has been created successfully.`,
      });
      
      // Navigate to the orders page
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

  // Submit handler
  const onSubmit = (data: CustomOrderFormData) => {
    customOrderMutation.mutate(data);
  };

  // Determine if it's a guest post form based on the domain type
  const isGuestPost = selectedDomain && 
    (selectedDomain.type === 'guest_post' || 
    (selectedDomain.type === 'both' && customOrderForm.watch('sourceUrl') === 'not_applicable'));

  if (initializing) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center">
          <Link href="/orders">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold tracking-tight">New Order</h2>
          <p className="text-muted-foreground">
            {selectedDomain ? 
              `Create a new ${isGuestPost ? 'guest post' : 'niche edit'} order for ${selectedDomain.websiteName}` : 
              "Create a new order"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...customOrderForm}>
            <form onSubmit={customOrderForm.handleSubmit(onSubmit)} className="space-y-4">
              {!isGuestPost && (
                <FormField
                  control={customOrderForm.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={customOrderForm.control}
                name="targetUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={customOrderForm.control}
                name="anchorText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anchor Text</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={customOrderForm.control}
                name="textEdit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isGuestPost ? 'Article Title' : 'Text Edit'}</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={customOrderForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={customOrderForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        value={field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={customOrderMutation.isPending}
                >
                  {customOrderMutation.isPending && (
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
  );
}