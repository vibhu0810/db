import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Domain, User } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { z } from "zod";

type OrderType = "guest_post" | "niche_edit";

function getTurnaroundTime(domain: Domain, orderType: OrderType | null) {
  if (orderType === "guest_post") {
    return "10 working days post content approval";
  } else {
    return "5-7 business days";
  }
}

// Update the form schema to properly handle guest post fields
const formSchema = z.object({
  sourceUrl: z.string()
    .min(1, "Source URL is required")
    .url("Must be a valid URL"),
  targetUrl: z.string()
    .min(1, "Target URL is required")
    .url("Must be a valid URL"),
  anchorText: z.string().min(1, "Anchor text is required"),
  title: z.string().optional(),
  content: z.string().optional(),
  textEdit: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewOrder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const domainUrl = searchParams.get("domain");
  const [selectedType, setSelectedType] = useState<OrderType | null>(null);
  const [weWriteContent, setWeWriteContent] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: domains = [] } = useQuery<Domain[]>({
    queryKey: ['/api/domains']
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: isAdmin
  });

  const domain = domains.find(d => d.websiteUrl === domainUrl);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceUrl: "",
      targetUrl: "",
      anchorText: "",
      title: "",
      content: "",
      textEdit: "",
      notes: "",
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!domain) throw new Error("Domain not found");
      if (!selectedType) throw new Error("Order type not selected");

      const orderData = {
        ...data,
        type: selectedType,
        domainId: domain.id,
        weWriteContent,
        price: selectedType === "guest_post" ? domain.guestPostPrice : domain.nicheEditPrice,
        userId: isAdmin && selectedUserId ? selectedUserId : undefined,
      };

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
      toast({
        title: "Error creating order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (selectedType === "guest_post") {
      if (!data.title?.trim()) {
        form.setError("title", { message: "Title is required for guest posts" });
        return;
      }

      if (!weWriteContent && !data.content?.trim()) {
        form.setError("content", { message: "Content URL is required when not using our writing service" });
        return;
      }
    }

    createOrderMutation.mutate(data);
  };

  if (!domain) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Domain not found</p>
      </div>
    );
  }

  const isNicheEdit = selectedType === "niche_edit" || domain.type === "niche_edit";
  const isGuestPost = selectedType === "guest_post" || domain.type === "guest_post";
  const price = isGuestPost ? domain.guestPostPrice : domain.nicheEditPrice;
  const turnaroundTime = getTurnaroundTime(domain, selectedType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => selectedType ? setSelectedType(null) : setLocation("/domains")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {selectedType ? 'Back to Order Type' : 'Back to Domains'}
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">New Order</h2>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{selectedType ? 'Order Details' : 'Select Order Type'}</CardTitle>
          <CardDescription asChild>
            <div>
              Create a new order for {domain.websiteUrl}
              {selectedType && (
                <div className="mt-2">
                  <span className="text-sm text-muted-foreground">
                    TAT: {turnaroundTime}
                    {isGuestPost && (
                      <span className="block mt-1">Note: Guest post title must be approved before proceeding with content creation.</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedType ? (
            <div className="space-y-4">
              <RadioGroup
                onValueChange={(value) => setSelectedType(value as OrderType)}
                className="space-y-4"
              >
                {(domain.type === "both" || domain.type === "guest_post") && (
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent">
                    <RadioGroupItem value="guest_post" id="guest_post" />
                    <div className="flex-1">
                      <label htmlFor="guest_post" className="text-lg font-medium block">
                        Guest Post
                      </label>
                      <span className="text-muted-foreground block">
                        ${domain.guestPostPrice}
                      </span>
                    </div>
                  </div>
                )}
                {(domain.type === "both" || domain.type === "niche_edit") && (
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent">
                    <RadioGroupItem value="niche_edit" id="niche_edit" />
                    <div className="flex-1">
                      <label htmlFor="niche_edit" className="text-lg font-medium block">
                        Niche Edit
                      </label>
                      <span className="text-muted-foreground block">
                        ${domain.nicheEditPrice}
                      </span>
                    </div>
                  </div>
                )}
              </RadioGroup>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {isAdmin && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Select User</h3>
                    <Select
                      value={selectedUserId?.toString()}
                      onValueChange={(value) => setSelectedUserId(Number(value))}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.companyName || user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {isGuestPost && (
                  <>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Post Title *</FormLabel>
                          <FormControl>
                            <Input {...field} required />
                          </FormControl>
                          <FormDescription>
                            Enter the title for your guest post
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                          <RadioGroupItem value="user_provides" id="user_provides" />
                          <label htmlFor="user_provides">
                            I'll provide the content (URL)
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="we_write" id="we_write" />
                          <label htmlFor="we_write">
                            Write the content for me ($80 for 1000 words)
                          </label>
                        </div>
                      </RadioGroup>
                    </div>

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
                              Provide a URL to your content (e.g., Google Docs, Dropbox)
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
                        <FormLabel>Source URL *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            required
                            placeholder={`https://${domain.websiteUrl}/blog/example`}
                            onChange={(e) => {
                              field.onChange(e);
                              form.trigger("sourceUrl"); // Trigger validation on change
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the URL of the existing article where you want to add your link
                          (must be from {domain.websiteUrl})
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
                      <FormLabel>Target URL *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          required
                          type="url"
                          onChange={(e) => {
                            field.onChange(e);
                            form.trigger("targetUrl"); // Trigger validation on change
                          }}
                        />
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
                      <FormLabel>Anchor Text *</FormLabel>
                      <FormControl>
                        <Input {...field} required />
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
                          Provide instructions for how you want the link to be added
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormDescription>
                        Add any additional notes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedType(null)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={createOrderMutation.isPending || (isAdmin && !selectedUserId)}
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
  );
}