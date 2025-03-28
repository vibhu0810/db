import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UserWithStats {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  country: string;
  is_admin: boolean;
  orders: {
    total: number;
    completed: number;
    pending: number;
    totalSpent: number;
  };
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<number[]>([]);
  const [sortField, setSortField] = useState<string>("orders.total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data: users = [], isLoading } = useQuery<UserWithStats[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      // First get basic user data
      const usersResponse = await apiRequest("GET", "/api/users");
      const usersData = await usersResponse.json();
      
      console.log("Users data:", usersData);
      
      // Transform the data to include order stats
      // Since we don't have the /api/users/stats endpoint, we'll provide default values for orders
      return usersData.map((user: any) => ({
        ...user,
        orders: {
          total: user.orders?.total || 0,
          completed: user.orders?.completed || 0,
          pending: user.orders?.pending || 0,
          totalSpent: user.orders?.totalSpent || 0
        }
      }));
    },
  });

  const toggleUserExpanded = (userId: number) => {
    setExpandedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Ensure users is an array before filtering
  const filteredUsers = Array.isArray(users) 
    ? users
      // First filter out admin users
      .filter((user: UserWithStats) => !user.is_admin)
      // Then apply search filter
      .filter((user: UserWithStats) =>
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a: UserWithStats, b: UserWithStats) => {
        const getValue = (user: UserWithStats, field: string) => {
          if (field.startsWith("orders.")) {
            const key = field.split(".")[1] as keyof typeof user.orders;
            return user.orders[key];
          }
          return (user as any)[field];
        };

        const aValue = getValue(a, sortField);
        const bValue = getValue(b, sortField);

        if (typeof aValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue as string)
            : (bValue as string).localeCompare(aValue);
        }

        return sortDirection === "asc"
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      })
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(field)}
      className="hover:bg-transparent"
    >
      {children}
      {sortField === field && (
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 transition-transform",
            sortDirection === "asc" && "rotate-180"
          )}
        />
      )}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(users) ? users.filter(u => !u.is_admin).length : 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(users) ? users.filter((u) => !u.is_admin && u.orders?.total > 0).length : 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(users) 
                ? users.filter(u => !u.is_admin).reduce((sum, user) => sum + user.orders.total, 0) 
                : 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Array.isArray(users) 
                ? users.filter(u => !u.is_admin).reduce((sum, user) => sum + user.orders.totalSpent, 0).toFixed(2) 
                : "0.00"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="min-w-[200px] max-w-[300px]">
                      <SortButton field="username">Name</SortButton>
                    </TableHead>
                    <TableHead className="min-w-[200px] max-w-[300px]">
                      <SortButton field="companyName">Company</SortButton>
                    </TableHead>
                    <TableHead className="min-w-[200px] max-w-[300px]">
                      <SortButton field="email">Email</SortButton>
                    </TableHead>
                    <TableHead className="min-w-[120px]">
                      <SortButton field="country">Country</SortButton>
                    </TableHead>
                    <TableHead className="text-right min-w-[120px]">
                      <SortButton field="orders.total">Total Orders</SortButton>
                    </TableHead>
                    <TableHead className="text-right min-w-[120px]">
                      <SortButton field="orders.pending">Pending Orders</SortButton>
                    </TableHead>
                    <TableHead className="text-right min-w-[120px]">
                      <SortButton field="orders.totalSpent">Total Spent</SortButton>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(filteredUsers) && filteredUsers.map((user: UserWithStats) => (
                    <React.Fragment key={user.id}>
                      <TableRow className="hover:bg-muted/50 cursor-pointer">
                        <TableCell className="w-[50px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleUserExpanded(user.id)}
                          >
                            {expandedUsers.includes(user.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              @{user.username}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="truncate max-w-[250px]">{user.companyName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="truncate max-w-[250px]">{user.email}</div>
                        </TableCell>
                        <TableCell>{user.country}</TableCell>
                        <TableCell className="text-right">{user.orders.total}</TableCell>
                        <TableCell className="text-right">{user.orders.pending}</TableCell>
                        <TableCell className="text-right">${user.orders.totalSpent.toFixed(2)}</TableCell>
                      </TableRow>
                      {expandedUsers.includes(user.id) && (
                        <TableRow>
                          <TableCell colSpan={8} className="p-0">
                            <div className="p-4 bg-muted/30 space-y-4">
                              <div className="grid grid-cols-3 gap-4">
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm">Order Status Breakdown</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span>Completed:</span>
                                        <span>{user.orders.completed}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Pending:</span>
                                        <span>{user.orders.pending}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Total:</span>
                                        <span>{user.orders.total}</span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm">Contact Information</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2">
                                      <div>
                                        <span className="text-muted-foreground">Email:</span>
                                        <div className="truncate">{user.email}</div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Country:</span>
                                        <div>{user.country}</div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm">Financial Summary</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span>Total Spent:</span>
                                        <span>${user.orders.totalSpent.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Average Order Value:</span>
                                        <span>
                                          ${(user.orders.totalSpent / (user.orders.total || 1)).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}