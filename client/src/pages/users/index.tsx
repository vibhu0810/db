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
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [sortField, setSortField] = useState<string>("orders.total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredUsers = users
    .filter(user =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
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
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const SortButton = ({ field, children }: { field: string, children: React.ReactNode }) => (
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
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
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
              <TableHead>
                <SortButton field="username">Name</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="companyName">Company</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="email">Email</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="country">Country</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="orders.total">Total Orders</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="orders.pending">Pending Orders</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="orders.totalSpent">Total Spent</SortButton>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <React.Fragment key={user.id}>
                <TableRow className="hover:bg-muted/50 cursor-pointer">
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
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}