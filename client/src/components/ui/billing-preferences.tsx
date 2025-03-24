import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { updateBillingSchema } from '@/../../shared/schema';
import { countries } from '@/lib/countries';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { PaymentDetails } from '@/components/ui/payment-details';
import { useToast } from '@/hooks/use-toast';

// Extended schema to include all the required billing fields
const billingFormSchema = z.object({
  personName: z.string().min(2, "Name is required"),
  billingEmail: z.string().email("Please enter a valid email address"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  zipCode: z.string().min(1, "ZIP/PIN code is required"),
  billingPreferences: z.enum(["paypal", "wire"]),
  notes: z.string().optional(),
});

type BillingFormValues = z.infer<typeof billingFormSchema>;

interface BillingPreferencesProps {
  user: any; // User object with billing information
  hidePaymentDetails?: boolean; // Option to hide payment details section
}

export function BillingPreferences({ user, hidePaymentDetails = false }: BillingPreferencesProps) {
  const { toast } = useToast();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  
  // We'll store preferences in localStorage to persist them between sessions
  useEffect(() => {
    // Try to get saved preferences from localStorage
    const savedPreferences = localStorage.getItem('billingPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        if (parsed.billingPreferences) {
          setSelectedPaymentMethod(parsed.billingPreferences);
        }
      } catch (e) {
        console.error('Error parsing saved billing preferences', e);
      }
    }
  }, []);

  // Get saved preferences from localStorage or use defaults
  const getSavedPreferences = () => {
    try {
      const savedPreferences = localStorage.getItem('billingPreferences');
      if (savedPreferences) {
        return JSON.parse(savedPreferences);
      }
    } catch (e) {
      console.error('Error parsing saved billing preferences', e);
    }
    
    return {};
  };
  
  const savedPrefs = getSavedPreferences();

  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingFormSchema),
    defaultValues: {
      personName: savedPrefs.personName || user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      billingEmail: savedPrefs.billingEmail || user?.email || '',
      city: savedPrefs.city || '',
      state: savedPrefs.state || '',
      country: savedPrefs.country || user?.country || '',
      zipCode: savedPrefs.zipCode || '',
      billingPreferences: savedPrefs.billingPreferences || 'wire',
      notes: savedPrefs.notes || '',
    },
  });

  const updateBillingMutation = useMutation({
    mutationFn: async (data: BillingFormValues) => {
      // Save to localStorage 
      localStorage.setItem('billingPreferences', JSON.stringify(data));
      
      // In a real implementation, we would also save to the database
      // For now, we'll create a notification for the admin
      try {
        // Create notification for admin users
        const notification = {
          // We'll send this to user ID 1 which is typically the admin account
          userId: 1, 
          message: `${user.username} has updated their billing information.`,
          type: 'billing_update',
          orderId: null,
          read: false,
          createdAt: new Date().toISOString(),
        };
        
        // Send the notification
        const res = await apiRequest('POST', '/api/notifications', notification);
        if (!res.ok) {
          console.error('Failed to send notification to admin');
        }
      } catch (e) {
        console.error('Error sending admin notification:', e);
      }
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Preferences Saved',
        description: 'Your billing preferences have been updated.',
      });
      
      // Invalidate any related queries
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update billing preferences',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: BillingFormValues) => {
    updateBillingMutation.mutateAsync(data).then(() => {
      setSelectedPaymentMethod(data.billingPreferences || null);
    });
  };

  // Watch payment method changes to update display
  const watchedPaymentMethod = form.watch('billingPreferences');
  
  useEffect(() => {
    if (watchedPaymentMethod) {
      setSelectedPaymentMethod(watchedPaymentMethod);
    }
  }, [watchedPaymentMethod]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Preferences</CardTitle>
        <CardDescription>
          Update your billing information and preferred payment method
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Person/Business Name */}
            <FormField
              control={form.control}
              name="personName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Person Name / Business Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your name or business name" 
                      {...field} 
                      disabled={updateBillingMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Email */}
            <FormField
              control={form.control}
              name="billingEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder="Enter your email address" 
                      {...field} 
                      disabled={updateBillingMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* City */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your city" 
                      {...field} 
                      disabled={updateBillingMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* State */}
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your state/province" 
                      {...field} 
                      disabled={updateBillingMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Country */}
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country <span className="text-red-500">*</span></FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={updateBillingMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      <div className="sticky top-0 bg-background px-2 py-2 z-10">
                        <Input
                          placeholder="Search countries..."
                          className="mb-1"
                          onChange={(e) => {
                            // Filter countries based on search
                            const value = e.target.value.toLowerCase();
                            const items = document.querySelectorAll('[data-country-item]');
                            items.forEach((item) => {
                              const text = (item.textContent || '').toLowerCase();
                              const shouldShow = text.includes(value);
                              (item as HTMLElement).style.display = shouldShow ? '' : 'none';
                            });
                          }}
                        />
                      </div>
                      {countries.map((country) => (
                        <SelectItem 
                          key={country.value} 
                          value={country.value}
                          data-country-item
                        >
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* ZIP/PIN Code */}
            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code / PIN Code <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your ZIP or PIN code" 
                      {...field} 
                      disabled={updateBillingMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Payment Method */}
            <FormField
              control={form.control}
              name="billingPreferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Payment Method <span className="text-red-500">*</span></FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={updateBillingMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="wire">Wire Transfer / Wise (0% fee)</SelectItem>
                      <SelectItem value="paypal">PayPal (5% fee)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any special instructions for billing" 
                      {...field} 
                      disabled={updateBillingMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              disabled={updateBillingMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateBillingMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Preferences
            </Button>
          </form>
        </Form>
        
        {/* Show payment details based on selection, but only if not hidden */}
        {selectedPaymentMethod && !hidePaymentDetails && (
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Payment Details</h3>
            <div className="rounded-md bg-muted p-4">
              <PaymentDetails paymentMethod={selectedPaymentMethod} />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {selectedPaymentMethod === 'paypal' 
                ? 'Note: PayPal payments incur a 5% transaction fee which will be added to your invoice.'
                : 'Wire transfers have no additional fees.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}