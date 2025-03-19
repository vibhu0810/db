import { useState } from "react";
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

interface UserWithStats {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  country: string;
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

  const { data: users = [], isLoading } = useQuery<UserWithStats[]>({
    queryKey: ['/api/users/stats'],
    queryFn: () => apiRequest("GET", "/api/users/stats").then(res => res.json()),
  });

  const toggleUserExpanded = (userId: number) => {
    setExpandedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.orders.total > 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.reduce((sum, user) => sum + user.orders.total, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${users.reduce((sum, user) => sum + user.orders.totalSpent, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Total Orders</TableHead>
              <TableHead>Pending Orders</TableHead>
              <TableHead>Total Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <>
                <TableRow key={user.id} className="hover:bg-muted/50 cursor-pointer">
                  <TableCell>
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
                    {user.firstName} {user.lastName}
                    <br />
                    <span className="text-sm text-muted-foreground">
                      @{user.username}
                    </span>
                  </TableCell>
                  <TableCell>{user.companyName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.country}</TableCell>
                  <TableCell>{user.orders.total}</TableCell>
                  <TableCell>{user.orders.pending}</TableCell>
                  <TableCell>${user.orders.totalSpent.toFixed(2)}</TableCell>
                </TableRow>
                {expandedUsers.includes(user.id) && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="p-4 space-y-4">
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
                                  <br />
                                  {user.email}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Country:</span>
                                  <br />
                                  {user.country}
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
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
