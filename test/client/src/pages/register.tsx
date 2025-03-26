import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertUserSchema, insertOrganizationSchema } from '../../../shared/schema';

// Define registration schema with additional validations
const registrationSchema = z.object({
  organization: insertOrganizationSchema.extend({
    name: z.string().min(2, 'Organization name is required').max(100),
  }),
  user: insertUserSchema.extend({
    username: z.string().min(3, 'Username must be at least 3 characters').max(50),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    companyName: z.string().optional(),
    termsAccepted: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions'
    })
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  })
});

type FormData = z.infer<typeof registrationSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      organization: {
        name: '',
        subscription_plan: 'basic'
      },
      user: {
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        companyName: '',
        termsAccepted: false,
        role: 'admin',
        is_admin: true
      }
    },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setIsLoading(true);

    // Remove confirm password and terms before sending
    const { confirmPassword, termsAccepted, ...userDataToSend } = data.user;

    try {
      const response = await fetch('/api/test/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization: data.organization,
          user: userDataToSend
        }),
        credentials: 'include',
      });

      if (response.ok) {
        // Registration successful and user is automatically logged in
        setLocation('/test/admin/dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg p-8 space-y-8 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Set up your SaaSxLinks account
          </p>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium">Organization Details</h2>
              <div className="space-y-4 mt-3">
                <div>
                  <label htmlFor="organization.name" className="text-sm font-medium">
                    Organization Name *
                  </label>
                  <input
                    id="organization.name"
                    {...form.register('organization.name')}
                    className="w-full p-2 border rounded-md mt-1"
                    placeholder="Your organization name"
                    disabled={isLoading}
                  />
                  {form.formState.errors.organization?.name && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.organization.name.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium">Admin User Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <label htmlFor="user.firstName" className="text-sm font-medium">
                    First Name *
                  </label>
                  <input
                    id="user.firstName"
                    {...form.register('user.firstName')}
                    className="w-full p-2 border rounded-md mt-1"
                    placeholder="First name"
                    disabled={isLoading}
                  />
                  {form.formState.errors.user?.firstName && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.user.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="user.lastName" className="text-sm font-medium">
                    Last Name *
                  </label>
                  <input
                    id="user.lastName"
                    {...form.register('user.lastName')}
                    className="w-full p-2 border rounded-md mt-1"
                    placeholder="Last name"
                    disabled={isLoading}
                  />
                  {form.formState.errors.user?.lastName && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.user.lastName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="user.username" className="text-sm font-medium">
                    Username *
                  </label>
                  <input
                    id="user.username"
                    {...form.register('user.username')}
                    className="w-full p-2 border rounded-md mt-1"
                    placeholder="Choose a username"
                    disabled={isLoading}
                  />
                  {form.formState.errors.user?.username && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.user.username.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="user.email" className="text-sm font-medium">
                    Email *
                  </label>
                  <input
                    id="user.email"
                    type="email"
                    {...form.register('user.email')}
                    className="w-full p-2 border rounded-md mt-1"
                    placeholder="your@email.com"
                    disabled={isLoading}
                  />
                  {form.formState.errors.user?.email && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.user.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="user.password" className="text-sm font-medium">
                    Password *
                  </label>
                  <input
                    id="user.password"
                    type="password"
                    {...form.register('user.password')}
                    className="w-full p-2 border rounded-md mt-1"
                    placeholder="Create a password"
                    disabled={isLoading}
                  />
                  {form.formState.errors.user?.password && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.user.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="user.confirmPassword" className="text-sm font-medium">
                    Confirm Password *
                  </label>
                  <input
                    id="user.confirmPassword"
                    type="password"
                    {...form.register('user.confirmPassword')}
                    className="w-full p-2 border rounded-md mt-1"
                    placeholder="Confirm your password"
                    disabled={isLoading}
                  />
                  {form.formState.errors.user?.confirmPassword && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.user.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="user.companyName" className="text-sm font-medium">
                    Company Name
                  </label>
                  <input
                    id="user.companyName"
                    {...form.register('user.companyName')}
                    className="w-full p-2 border rounded-md mt-1"
                    placeholder="Your company (optional)"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center">
                  <input
                    id="user.termsAccepted"
                    type="checkbox"
                    {...form.register('user.termsAccepted')}
                    className="h-4 w-4 border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <label htmlFor="user.termsAccepted" className="ml-2 text-sm">
                    I accept the{' '}
                    <a href="/test/terms" className="text-primary hover:underline">
                      Terms and Conditions
                    </a>
                  </label>
                </div>
                {form.formState.errors.user?.termsAccepted && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.user.termsAccepted.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <p>
            Already have an account?{' '}
            <a href="/test/login" className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        </div>
        
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} SaaSxLinks. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}