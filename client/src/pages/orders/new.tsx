import { useMutation } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2, Info, Link as LinkIcon, FileText, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  type: "guest_post" | "niche_edit";
}

interface Domain {
  id: number;
  websiteName: string;
  websiteUrl: string;
  domainRating: string;
  websiteTraffic: number;
  type: "guest_post" | "niche_edit" | "both";
  guestPostPrice?: string;
  nicheEditPrice?: string;
  guidelines?: string;
}

export default function NewOrderPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [initializing, setInitializing] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [orderType, setOrderType] = useState<"guest_post" | "niche_edit" | null>(null);
  
  // Get domain from URL query parameter
  const query = new URLSearchParams(window.location.search);
  const domainId = query.get('domain');

  // Fetch all domains
  const { data: domains = [] } = useQuery({
    queryKey: ['/api/domains'],
    queryFn: () => apiRequest("GET", `/api/domains`).then(res => res.json()),
  });

  // Create schema for the custom order form
  const customOrderSchema = z.object({
    userId: z.number().int().positive(),
    sourceUrl: z.string().refine(val => {
      // Only validate sourceUrl if it's a niche edit order
      if (orderType === "niche_edit") {
        return val.length > 0;
      }
      return true;
    }, "Source URL is required for Niche Edit orders"),
    targetUrl: z.string().url("Please enter a valid URL"),
    anchorText: z.string().min(1, "Anchor text is required"),
    textEdit: z.string().optional(),
    notes: z.string().optional(),
    price: z.union([z.string(), z.number()]),
    type: z.enum(["guest_post", "niche_edit"]),
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
      type: "niche_edit",
    },
    mode: "onTouched", // Only validate fields after they've been touched
  });

  const watchOrderType = customOrderForm.watch("type");
  
  // Effect to set sourceUrl to not_applicable for guest posts
  useEffect(() => {
    if (watchOrderType === "guest_post") {
      customOrderForm.setValue("sourceUrl", "not_applicable");
    } else if (watchOrderType === "niche_edit" && customOrderForm.getValues("sourceUrl") === "not_applicable") {
      customOrderForm.setValue("sourceUrl", "");
    }
    
    setOrderType(watchOrderType);
  }, [watchOrderType, customOrderForm]);

  // Find the selected domain based on the domain ID from the URL
  useEffect(() => {
    if (domains.length > 0 && domainId) {
      const domain = domains.find((d: Domain) => d.id.toString() === domainId);
      if (domain) {
        setSelectedDomain(domain);
        
        // Set default values based on domain type
        if (domain.type === 'guest_post') {
          customOrderForm.setValue('type', 'guest_post');
          customOrderForm.setValue('sourceUrl', 'not_applicable');
          customOrderForm.setValue('price', domain.guestPostPrice ? parseFloat(domain.guestPostPrice) : 0);
        } else if (domain.type === 'niche_edit') {
          customOrderForm.setValue('type', 'niche_edit');
          customOrderForm.setValue('price', domain.nicheEditPrice ? parseFloat(domain.nicheEditPrice) : 0);
        } else if (domain.type === 'both') {
          // Default to guest post for "both" type domains, but allow switching
          customOrderForm.setValue('type', 'guest_post');
          customOrderForm.setValue('sourceUrl', 'not_applicable');
          customOrderForm.setValue('price', domain.guestPostPrice ? parseFloat(domain.guestPostPrice) : 0);
        }
      }
      setInitializing(false);
    } else if (domains.length > 0) {
      setInitializing(false);
    }
  }, [domains, domainId, customOrderForm]);

  // Effect to update price when order type changes
  useEffect(() => {
    if (selectedDomain && orderType) {
      if (orderType === 'guest_post' && selectedDomain.guestPostPrice) {
        customOrderForm.setValue('price', parseFloat(selectedDomain.guestPostPrice));
      } else if (orderType === 'niche_edit' && selectedDomain.nicheEditPrice) {
        customOrderForm.setValue('price', parseFloat(selectedDomain.nicheEditPrice));
      }
    }
  }, [selectedDomain, orderType, customOrderForm]);

  // API mutation to create a new order
  const customOrderMutation = useMutation({
    mutationFn: async (data: CustomOrderFormData) => {
      const payload: any = {
        ...data,
        price: typeof data.price === "string" ? parseFloat(data.price) : data.price,
      };
      
      // Add domain-specific fields for guest posts
      if (data.type === 'guest_post' && selectedDomain) {
        payload.title = data.textEdit || "Guest Post";
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

  // Function to determine if domain supports the selected order type
  const isDomainTypeSupported = (type: string) => {
    if (!selectedDomain) return true;
    if (selectedDomain.type === "both") return true;
    return selectedDomain.type === type;
  };

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
              `Create a new order for ${selectedDomain.websiteName}` : 
              "Create a new order"}
          </p>
        </div>
      </div>

      {selectedDomain && (
        <Card>
          <CardHeader>
            <CardTitle>Domain Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Website</h3>
                <div className="flex items-center">
                  <span className="font-medium">{selectedDomain.websiteName}</span>
                  <a 
                    href={`https://${selectedDomain.websiteUrl}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="ml-2 text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Domain Rating</h3>
                <span className="font-medium">{selectedDomain.domainRating}</span>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Traffic</h3>
                <span className="font-medium">{Number(selectedDomain.websiteTraffic).toLocaleString()}</span>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Services</h3>
                <span className="font-medium">
                  {selectedDomain.type === "both" 
                    ? "Guest Post & Niche Edit" 
                    : selectedDomain.type === "guest_post" 
                      ? "Guest Post" 
                      : "Niche Edit"}
                </span>
              </div>
              {selectedDomain.guidelines && (
                <div className="col-span-1 md:col-span-2">
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">Guidelines</h3>
                  <p className="text-sm">{selectedDomain.guidelines}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
          {selectedDomain && selectedDomain.type === "both" && (
            <CardDescription>
              This domain supports both Guest Post and Niche Edit services. Please select your preferred service type.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Form {...customOrderForm}>
            <form onSubmit={customOrderForm.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Order Type Selection */}
              {(selectedDomain?.type === "both" || !selectedDomain) && (
                <FormField
                  control={customOrderForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Order Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="guest_post" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Guest Post
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 ml-1 inline-block text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">A new article created and published on the website with your link and anchor text.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="niche_edit" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Niche Edit
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 ml-1 inline-block text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Your link and anchor text will be added to an existing article on the website.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {orderType === "niche_edit" && (
                <FormField
                  control={customOrderForm.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source URL</FormLabel>
                      <FormDescription>
                        The URL of the existing article where your link will be added
                      </FormDescription>
                      <FormControl>
                        <Input {...field} placeholder="https://example.com/article" />
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
                    <FormDescription>
                      The URL you want to link to (your website)
                    </FormDescription>
                    <FormControl>
                      <Input {...field} placeholder="https://yourwebsite.com/page" />
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
                    <FormDescription>
                      The clickable text that will contain your link
                    </FormDescription>
                    <FormControl>
                      <Input {...field} placeholder="e.g. best SEO tools" />
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
                    <FormLabel>{orderType === "guest_post" ? 'Article Title' : 'Text Edit'}</FormLabel>
                    <FormDescription>
                      {orderType === "guest_post" 
                        ? "The title of the guest post article" 
                        : "Surrounding text suggestions for your link (optional)"}
                    </FormDescription>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder={orderType === "guest_post" 
                          ? "e.g. 10 Best SEO Strategies for 2025" 
                          : "e.g. Consider using tools like [anchor text] to improve your results"} 
                      />
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
                    <FormDescription>
                      Any additional instructions or requirements
                    </FormDescription>
                    <FormControl>
                      <Textarea {...field} placeholder="e.g. Prefer the link to be in the first half of the article" />
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
                    <FormDescription>
                      {selectedDomain && orderType === "guest_post" && selectedDomain.guestPostPrice 
                        ? `Standard price: $${selectedDomain.guestPostPrice}` 
                        : selectedDomain && orderType === "niche_edit" && selectedDomain.nicheEditPrice 
                          ? `Standard price: $${selectedDomain.nicheEditPrice}` 
                          : "Price for this order"}
                    </FormDescription>
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