import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { updateBillingSchema } from '@/../../shared/schema';

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
import { Loader2 } from 'lucide-react';
import { PaymentDetails } from '@/components/ui/payment-details';
import { useToast } from '@/hooks/use-toast';

type BillingPreferencesFormValues = z.infer<typeof updateBillingSchema>;

interface BillingPreferencesProps {
  user: any; // User object with billing information
}

export function BillingPreferences({ user }: BillingPreferencesProps) {
  const { toast } = useToast();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  
  // We'll store preferences in localStorage to persist them between sessions
  // We could alternatively save these to the user's profile in the database
  useEffect(() => {
    // Try to get saved preferences from localStorage
    const savedPreferences = localStorage.getItem('billingPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        if (parsed.paymentMethod) {
          setSelectedPaymentMethod(parsed.paymentMethod);
        }
      } catch (e) {
        console.error('Error parsing saved billing preferences', e);
      }
    }
  }, []);

  const form = useForm<BillingPreferencesFormValues>({
    resolver: zodResolver(updateBillingSchema),
    defaultValues: {
      billingAddress: user?.billingAddress || '',
      billingEmail: user?.email || '',
      billingPreferences: (localStorage.getItem('billingPreferences') ? 
        JSON.parse(localStorage.getItem('billingPreferences') || '{}').paymentMethod : 
        '') || 'wire',
    },
  });

  const updateBillingMutation = useMutation({
    mutationFn: async (data: BillingPreferencesFormValues) => {
      // Save to localStorage for now
      localStorage.setItem('billingPreferences', JSON.stringify({
        billingAddress: data.billingAddress,
        billingEmail: data.billingEmail,
        paymentMethod: data.billingPreferences,
      }));
      
      // This would be where we would save to the database if needed
      // const res = await apiRequest('PATCH', '/api/user/billing', data);
      // if (!res.ok) {
      //   const error = await res.json();
      //   throw new Error(error.message || 'Failed to update billing preferences');
      // }
      // return await res.json();
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Preferences Saved',
        description: 'Your billing preferences have been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update billing preferences',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: BillingPreferencesFormValues) => {
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
            <FormField
              control={form.control}
              name="billingAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your billing address" 
                      {...field} 
                      disabled={updateBillingMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="billingEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder="Enter your billing email" 
                      {...field} 
                      disabled={updateBillingMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Invoices will be sent to this email address
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="billingPreferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Payment Method</FormLabel>
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
        
        {/* Show payment details based on selection */}
        {selectedPaymentMethod && (
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