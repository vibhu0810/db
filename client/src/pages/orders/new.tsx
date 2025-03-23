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
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2, Info, Link as LinkIcon, FileText, ExternalLink, Clock, AlertCircle } from "lucide-react";
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
  contentOption?: "upload" | "write";
  contentDocument?: File;
  googleDocLink?: string;
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

// Turnaround time helper functions
function getGuestPostTAT(price: number): string {
  if (price >= 300) return "5-7 business days";
  if (price >= 200) return "7-10 business days";
  return "10-14 business days";
}

function getNicheEditTAT(price: number): string {
  if (price >= 300) return "2-3 business days";
  if (price >= 200) return "3-5 business days";
  return "5-7 business days";
}

export default function NewOrderPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [initializing, setInitializing] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [orderType, setOrderType] = useState<"guest_post" | "niche_edit" | null>(null);
  const [sourceUrlError, setSourceUrlError] = useState<string | null>(null);
  
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
    textEdit: z.string().refine(val => {
      // Require textEdit (article title) for guest posts
      if (orderType === "guest_post") {
        return val.length > 0;
      }
      return true;
    }, "Article title is required for Guest Posts"),
    notes: z.string().optional(),
    price: z.union([z.string(), z.number()]),
    type: z.enum(["guest_post", "niche_edit"]),
    contentOption: z.enum(["upload", "write"]).optional(),
    contentDocument: z.instanceof(File).optional(),
    googleDocLink: z.string().optional().refine(val => {
      if (val && val.length > 0) {
        return val.includes("docs.google.com");
      }
      return true;
    }, "Please enter a valid Google Docs URL"),
  }).refine((data) => {
    // Require contentOption if it's a guest post
    if (data.type === "guest_post") {
      return !!data.contentOption;
    }
    return true;
  }, {
    message: "Please select a content option for Guest Posts",
    path: ["contentOption"]
  }).refine((data) => {
    // For upload option, either document or Google Doc link must be provided
    if (data.type === "guest_post" && data.contentOption === "upload") {
      return !!data.contentDocument || (data.googleDocLink && data.googleDocLink.length > 0);
    }
    return true;
  }, {
    message: "Please provide either a document upload or a Google Doc link",
    path: ["contentDocument"]
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
      contentOption: "upload"
    },
    mode: "onTouched", // Only validate fields after they've been touched
  });

  const watchOrderType = customOrderForm.watch("type");
  const watchSourceUrl = customOrderForm.watch("sourceUrl");
  const watchPrice = customOrderForm.watch("price");
  const watchContentOption = customOrderForm.watch("contentOption");
  
  // Validate source URL to ensure it matches the domain
  useEffect(() => {
    if (orderType === "niche_edit" && selectedDomain && watchSourceUrl && watchSourceUrl !== "not_applicable") {
      try {
        const sourceUrlDomain = extractDomainFromUrl(watchSourceUrl);
        const domainUrl = selectedDomain.websiteUrl;
        
        if (sourceUrlDomain !== domainUrl) {
          setSourceUrlError(`Source URL must be from ${domainUrl}`);
        } else {
          setSourceUrlError(null);
        }
      } catch (e) {
        setSourceUrlError("Invalid URL format");
      }
    } else {
      setSourceUrlError(null);
    }
  }, [watchSourceUrl, selectedDomain, orderType]);
  
  // Effect to set sourceUrl to not_applicable for guest posts
  useEffect(() => {
    if (watchOrderType === "guest_post") {
      customOrderForm.setValue("sourceUrl", "not_applicable");
    } else if (watchOrderType === "niche_edit" && customOrderForm.getValues("sourceUrl") === "not_applicable") {
      customOrderForm.setValue("sourceUrl", "");
    }
    
    setOrderType(watchOrderType);
  }, [watchOrderType, customOrderForm]);

  // Find the selected domain based on the domain URL from the query parameter
  useEffect(() => {
    if (domains.length > 0 && domainId) {
      // Now domainId contains the website URL instead of the numerical ID
      const domain = domains.find((d: Domain) => d.websiteUrl === domainId);
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
  
  // No longer adjusting price based on content option changes
  // The price is determined solely by the domain and order type
  useEffect(() => {
    if (orderType === 'guest_post' && selectedDomain && selectedDomain.guestPostPrice) {
      let basePrice = parseFloat(selectedDomain.guestPostPrice);
      // Always use the base price regardless of content option
      customOrderForm.setValue('price', basePrice);
    }
  }, [watchContentOption, selectedDomain, orderType, customOrderForm]);

  // API mutation to create a new order
  const customOrderMutation = useMutation({
    mutationFn: async (data: CustomOrderFormData) => {
      // Validate source URL for niche edits
      if (data.type === 'niche_edit' && selectedDomain) {
        try {
          const sourceUrlDomain = extractDomainFromUrl(data.sourceUrl);
          const domainUrl = selectedDomain.websiteUrl;
          
          if (sourceUrlDomain !== domainUrl) {
            throw new Error(`Source URL must be from ${domainUrl}`);
          }
        } catch (e) {
          if (e instanceof Error) {
            throw e;
          }
          throw new Error("Invalid URL format");
        }
      }
      
      const payload: any = {
        ...data,
        price: typeof data.price === "string" ? parseFloat(data.price) : data.price,
      };
      
      // Add domain-specific fields for guest posts
      if (data.type === 'guest_post' && selectedDomain) {
        payload.title = data.textEdit; // Title is required for guest posts
        payload.website = {
          name: selectedDomain.websiteName,
          url: selectedDomain.websiteUrl
        };
        
        // Add content option information
        payload.contentOption = data.contentOption;
        
        // No longer adding extra cost for content writing service
        // The price depends on the domain and will be determined by admin
        
        // Remove the file from the payload since it can't be JSON serialized
        if (data.contentDocument) {
          delete payload.contentDocument;
          payload.hasContentDocument = true;
        }
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
    // Don't submit if there's a source URL error
    if (sourceUrlError) {
      toast({
        title: "Validation Error",
        description: sourceUrlError,
        variant: "destructive",
      });
      return;
    }
    
    customOrderMutation.mutate(data);
  };

  // Function to determine if domain supports the selected order type
  const isDomainTypeSupported = (type: string) => {
    if (!selectedDomain) return true;
    if (selectedDomain.type === "both") return true;
    return selectedDomain.type === type;
  };

  // Get turnaround time based on order type and price
  const getTurnaroundTime = () => {
    const price = typeof watchPrice === "string" ? parseFloat(watchPrice) : watchPrice;
    
    if (orderType === "guest_post") {
      return getGuestPostTAT(price);
    } else if (orderType === "niche_edit") {
      return getNicheEditTAT(price);
    }
    return "";
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
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">
                  {orderType === "guest_post" ? "Guest Post Price" : "Niche Edit Price"}
                </h3>
                <span className="font-medium">
                  {orderType === "guest_post" 
                    ? (selectedDomain.guestPostPrice ? `$${selectedDomain.guestPostPrice}` : "N/A") 
                    : (selectedDomain.nicheEditPrice ? `$${selectedDomain.nicheEditPrice}` : "N/A")}
                </span>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Turnaround Time</h3>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span className="font-medium">{getTurnaroundTime()}</span>
                </div>
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
                        {selectedDomain && (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              Must be from {selectedDomain.websiteUrl}
                            </Badge>
                          </div>
                        )}
                      </FormDescription>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field} 
                            placeholder={`https://${selectedDomain?.websiteUrl || 'example.com'}/article`}
                            className={sourceUrlError ? "border-red-500 pr-10" : ""}
                          />
                          {sourceUrlError && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                              <AlertCircle className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      {sourceUrlError && (
                        <p className="text-sm font-medium text-red-500 mt-1">{sourceUrlError}</p>
                      )}
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
                    <FormLabel>
                      {orderType === "guest_post" ? 'Article Title' : 'Text Edit'}
                      {orderType === "guest_post" && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </FormLabel>
                    <FormDescription>
                      {orderType === "guest_post" 
                        ? "The title of the guest post article (required)" 
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
              
              {/* Content Options for Guest Posts */}
              {orderType === "guest_post" && (
                <div className="space-y-4 border p-4 rounded-md bg-muted/30">
                  <h3 className="font-medium">Content Options <span className="text-red-500">*</span></h3>
                  
                  <FormField
                    control={customOrderForm.control}
                    name="contentOption"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Choose how you want to provide content <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="upload" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                I'll provide my own content
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="write" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                We will write the content at additional cost
                                <Badge className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                                  <Info className="h-3 w-3 mr-1" />
                                  Cost varies by domain
                                </Badge>
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {customOrderForm.watch("contentOption") === "upload" && (
                    <div className="space-y-4 mt-3">
                      <div>
                        <FormLabel className="block mb-2">Upload Content Document <span className="text-red-500">*</span></FormLabel>
                        <input 
                          type="file" 
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                          accept=".doc,.docx,.txt,.pdf,.rtf" 
                          onChange={(e) => {
                            if (e.target.files?.length) {
                              customOrderForm.setValue("contentDocument", e.target.files[0]);
                            }
                          }} 
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Accepted formats: DOC, DOCX, TXT, PDF, RTF (Max 5MB)
                        </p>
                      </div>

                      <div className="mt-3">
                        <FormField
                          control={customOrderForm.control}
                          name="googleDocLink"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Google Doc Link (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://docs.google.com/document/d/..."
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Alternatively, you can provide a link to your Google Doc
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
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
                    <div className="flex items-center">
                      <FormDescription className="mt-0">
                        {selectedDomain && orderType === "guest_post" && selectedDomain.guestPostPrice 
                          ? `Domain price: $${selectedDomain.guestPostPrice}` 
                          : selectedDomain && orderType === "niche_edit" && selectedDomain.nicheEditPrice 
                            ? `Domain price: $${selectedDomain.nicheEditPrice}` 
                            : "Service price"}
                      </FormDescription>
                      <Badge className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                        <Clock className="h-3 w-3 mr-1" />
                        {getTurnaroundTime()}
                      </Badge>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        value={field.value}
                        readOnly
                        disabled
                        className="bg-muted cursor-not-allowed"
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