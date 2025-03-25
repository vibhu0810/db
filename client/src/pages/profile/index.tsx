import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateProfile } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Check, Mail, Lock, User } from "lucide-react";
import { updateProfileSchema, updateUsernameSchema, updatePasswordSchema } from "@shared/schema";
import { uploadFile } from "@/utils/uploadthing";
import { countries } from "@/lib/countries";
import { PhoneInput } from "@/components/ui/phone-input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Extend the schema with stricter validation
const profileFormSchema = updateProfileSchema.extend({
  email: z.string().email("Please enter a valid email address"),
  bio: z.string().min(20, "Bio must be at least 20 characters long").max(2000, "Bio must not exceed 2000 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phoneNumber: z.string().min(5, "Phone number is required").max(20, "Phone number is too long"),
  linkedinUrl: z.string().min(1, "LinkedIn URL is required")
    .url("Please enter a valid LinkedIn URL")
    .includes("linkedin.com", { message: "URL must be from LinkedIn" }),
  instagramProfile: z.string().optional(),
});

// Username form schema
const usernameFormSchema = updateUsernameSchema;

// Password form schema
const passwordFormSchema = updatePasswordSchema;

type ProfileFormData = z.infer<typeof profileFormSchema>;
type UsernameFormData = z.infer<typeof usernameFormSchema>;
type PasswordFormData = z.infer<typeof passwordFormSchema>;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  // No need for useUploadThing hooks as we'll use the uploadFile utility directly
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      companyName: user?.companyName || "",
      country: user?.country || "",
      bio: user?.bio || "",
      profilePicture: user?.profilePicture || "",
      dateOfBirth: user?.dateOfBirth || "",
      phoneNumber: user?.phoneNumber || "",
      linkedinUrl: user?.linkedinUrl || "",
      instagramProfile: user?.instagramProfile || "",
      username: user?.username || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Failed to update profile");
      }
      const updatedUser = await res.json();
      return updatedUser;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Success",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof ProfileFormData) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let url;
      if (field === "profilePicture") {
        url = await uploadFile(file, "profileImage");
      }
      
      if (url) {
        form.setValue(field, url);
        toast({
          title: "Image uploaded",
          description: "Your profile picture has been uploaded successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Username form
  const usernameForm = useForm<UsernameFormData>({
    resolver: zodResolver(usernameFormSchema),
    defaultValues: {
      username: user?.username || "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Username update mutation
  const updateUsernameMutation = useMutation({
    mutationFn: async (data: UsernameFormData) => {
      const res = await apiRequest("PATCH", "/api/user/username", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Failed to update username");
      }
      return await res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Your username has been updated successfully.",
      });
      // Refresh user data
      await refreshUser();
      // Clear the form
      usernameForm.reset({ username: user?.username || "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update username",
        variant: "destructive",
      });
    },
  });

  // Password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const res = await apiRequest("PATCH", "/api/user/password", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Failed to update password");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your password has been updated successfully.",
      });
      // Clear the form
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    },
  });

  // Email verification request mutation
  const requestVerificationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/verify-email/request", {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Failed to send verification email");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "A verification email has been sent to your email address. Please check your inbox.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    await updateProfileMutation.mutateAsync(data);
  };

  const onUsernameSubmit = async (data: UsernameFormData) => {
    await updateUsernameMutation.mutateAsync(data);
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    await updatePasswordMutation.mutateAsync(data);
  };

  const handleVerificationRequest = async () => {
    await requestVerificationMutation.mutateAsync();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Account Settings</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-6">
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal and company information</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    {/* Profile Picture Upload */}
                    <FormField
                      control={form.control}
                      name="profilePicture"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Picture</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-4">
                              {field.value && (
                                <img
                                  src={field.value}
                                  alt="Profile"
                                  className="h-16 w-16 rounded-full object-cover"
                                />
                              )}
                              <div className="flex-1">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleFileUpload(e, "profilePicture")}
                                  disabled={isUploading || updateProfileMutation.isPending}
                                />
                              </div>
                              {field.value && (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => form.setValue("profilePicture", "")}
                                  disabled={updateProfileMutation.isPending}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          </FormControl>
                          <FormDescription>
                            Upload a profile picture (max 4MB)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={updateProfileMutation.isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={updateProfileMutation.isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel>Email Address *</FormLabel>
                            {user?.emailVerified ? (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 flex items-center gap-1 py-0">
                                <Check className="h-3 w-3" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 py-0">
                                !
                                Not Verified
                              </Badge>
                            )}
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type="email" 
                                {...field} 
                                disabled={updateProfileMutation.isPending}
                                placeholder="you@example.com"
                              />
                              {!user?.emailVerified && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 text-xs"
                                  onClick={handleVerificationRequest}
                                  disabled={requestVerificationMutation.isPending}
                                >
                                  {requestVerificationMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : null}
                                  Verify
                                </Button>
                              )}
                            </div>
                          </FormControl>
                          <FormDescription>
                            {!user?.emailVerified ? 
                              "Please verify your email address to ensure the security of your account." :
                              "Your email has been verified."
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={updateProfileMutation.isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={updateProfileMutation.isPending}
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
                                    // Create a search filter on Select content
                                    const value = e.target.value.toLowerCase();
                                    const items = document.querySelectorAll('[data-country-item]');
                                    let hasVisible = false;
                                    
                                    items.forEach((item) => {
                                      const text = (item.textContent || '').toLowerCase();
                                      const shouldShow = text.includes(value);
                                      
                                      if (shouldShow) {
                                        hasVisible = true;
                                        (item as HTMLElement).style.display = '';
                                      } else {
                                        (item as HTMLElement).style.display = 'none';
                                      }
                                    });
                                    
                                    // Show a "no results" message if needed
                                    const noResults = document.getElementById('no-country-results');
                                    if (noResults) {
                                      noResults.style.display = hasVisible ? 'none' : 'block';
                                    }
                                  }}
                                />
                              </div>
                              <div id="no-country-results" className="px-3 py-2 text-muted-foreground text-sm" style={{display: 'none'}}>
                                No countries found
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

                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" disabled={updateProfileMutation.isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <PhoneInput 
                              value={field.value} 
                              onChange={field.onChange} 
                              disabled={updateProfileMutation.isPending}
                              defaultCountry={user?.country || "US"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="linkedinUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn URL *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://www.linkedin.com/in/your-profile" disabled={updateProfileMutation.isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="instagramProfile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instagram Profile</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="@yourusername (optional)" disabled={updateProfileMutation.isPending} />
                          </FormControl>
                          <FormDescription>
                            Your Instagram handle is optional
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio *</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              disabled={updateProfileMutation.isPending}
                              placeholder="Share something about yourself..."
                            />
                          </FormControl>
                          <FormDescription>
                            20 - 2000 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending || isUploading}
                    className="w-full sm:w-auto bg-primary text-black hover:bg-primary/90 font-semibold"
                  >
                    {(updateProfileMutation.isPending || isUploading) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Change Username</CardTitle>
                <CardDescription>Update your account username</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...usernameForm}>
                  <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)} className="space-y-4">
                    <FormField
                      control={usernameForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter your new username" 
                              disabled={updateUsernameMutation.isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            This will be your new login username
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={updateUsernameMutation.isPending}
                      className="w-full bg-primary text-black hover:bg-primary/90 font-semibold"
                    >
                      {updateUsernameMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Update Username
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Ensure your account is using a secure password</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="password" 
                              placeholder="Enter your current password" 
                              disabled={updatePasswordMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="password" 
                              placeholder="Enter your new password" 
                              disabled={updatePasswordMutation.isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            At least 8 characters long
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="password" 
                              placeholder="Confirm your new password" 
                              disabled={updatePasswordMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={updatePasswordMutation.isPending}
                      className="w-full bg-primary text-black hover:bg-primary/90 font-semibold"
                    >
                      {updatePasswordMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Update Password
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}