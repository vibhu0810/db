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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { updateProfileSchema } from "@shared/schema";
import { uploadFile } from "@/utils/uploadthing";
import { countries } from "@/lib/countries";
import { PhoneInput } from "@/components/ui/phone-input";

// Extend the schema with stricter validation
const profileFormSchema = updateProfileSchema.extend({
  email: z.string().email("Please enter a valid email address"),
  bio: z.string().min(20, "Bio must be at least 20 characters long").max(500, "Bio must not exceed 500 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phoneNumber: z.string().min(5, "Phone number is required").max(20, "Phone number is too long"),
  linkedinUrl: z.string().min(1, "LinkedIn URL is required")
    .url("Please enter a valid LinkedIn URL")
    .includes("linkedin.com", { message: "URL must be from LinkedIn" }),
  instagramProfile: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
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
      companyLogo: user?.companyLogo || "",
      dateOfBirth: user?.dateOfBirth || "",
      phoneNumber: user?.phoneNumber || "",
      linkedinUrl: user?.linkedinUrl || "",
      instagramProfile: user?.instagramProfile || "",
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
      } else if (field === "companyLogo") {
        url = await uploadFile(file, "companyLogo");
      }
      
      if (url) {
        form.setValue(field, url);
        toast({
          title: "Image uploaded",
          description: `Your ${field === "profilePicture" ? "profile picture" : "company logo"} has been uploaded successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: `Failed to upload ${field === "profilePicture" ? "profile picture" : "company logo"}. Please try again.`,
        variant: "destructive",
      });
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    await updateProfileMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Profile Settings</h2>
        <div className="hidden md:block">
          <img 
            src={user?.companyLogo || ''} 
            alt={user?.companyName || 'Company logo'} 
            className="h-12 object-contain"
            onError={(e) => {
              // Hide the image if it fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      </div>

      <Card className="border-primary/10">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <span className="text-primary">Edit Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                {/* Company Logo Upload */}
                <FormField
                  control={form.control}
                  name="companyLogo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Logo</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          {field.value && (
                            <img
                              src={field.value}
                              alt="Company Logo"
                              className="h-16 w-16 object-contain"
                            />
                          )}
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, "companyLogo")}
                              disabled={isUploading || updateProfileMutation.isPending}
                            />
                          </div>
                          {field.value && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => form.setValue("companyLogo", "")}
                              disabled={updateProfileMutation.isPending}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Upload your company logo (max 4MB)
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
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          {...field} 
                          disabled={updateProfileMutation.isPending}
                          placeholder="you@example.com"
                        />
                      </FormControl>
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
                          placeholder="Share details about your business and link building requirements..."
                        />
                      </FormControl>
                      <FormDescription>
                        Provide information about your business, website, and specific requirements for link building campaigns (20-500 characters)
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
    </div>
  );
}