import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, PencilLine, Trash2, Loader2, X, MoveHorizontal } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "inprogress" | "done";
  priority: "low" | "medium" | "high";
  userId: number;
  createdAt: string;
  updatedAt: string;
}

type NewTask = Omit<Task, "id" | "createdAt" | "updatedAt">;

export default function KanbanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTask, setNewTask] = useState<NewTask>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    userId: user?.id || 0
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // Initialize with demo tasks for immediate visualization
  useEffect(() => {
    if (!queryClient.getQueryData(['/api/tasks'])) {
      const demoTasks: Task[] = [
        {
          id: "task-1",
          title: "Create link building campaign for client",
          description: "Set up a new guest post campaign targeting tech blogs",
          status: "todo",
          priority: "high",
          userId: user?.id || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "task-2",
          title: "Follow up with domain owners",
          description: "Send follow-up emails to website owners who haven't responded",
          status: "inprogress",
          priority: "medium",
          userId: user?.id || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "task-3",
          title: "Review content for Forbes submission",
          description: "Proofread and optimize the article for Forbes submission",
          status: "done",
          priority: "high",
          userId: user?.id || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      queryClient.setQueryData(['/api/tasks'], demoTasks);
    }
  }, [queryClient, user]);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['/api/tasks'],
    // Mock the task data for now since we don't have a backend endpoint yet
    initialData: [] as Task[]
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: NewTask) => {
      return apiRequest({
        url: '/api/tasks',
        method: 'POST',
        data: task
      });
    },
    onSuccess: () => {
      toast({
        title: "Task created",
        description: "Your task has been created successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setNewTask({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        userId: user?.id || 0
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to create task",
        description: error.message
      });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (task: Task) => {
      return apiRequest({
        url: `/api/tasks/${task.id}`,
        method: 'PATCH',
        data: task
      });
    },
    onSuccess: () => {
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setEditingTask(null);
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update task",
        description: error.message
      });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest({
        url: `/api/tasks/${taskId}`,
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Task deleted",
        description: "Your task has been deleted successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete task",
        description: error.message
      });
    }
  });

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast({
        variant: "destructive",
        title: "Title is required",
        description: "Please enter a title for your task."
      });
      return;
    }
    
    // Uncomment this when the backend API is ready
    // createTaskMutation.mutate(newTask);
    
    // For now, let's simulate task creation since we don't have a backend yet
    const mockNewTask: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    queryClient.setQueryData<Task[]>(['/api/tasks'], (old = []) => [...old, mockNewTask]);
    
    toast({
      title: "Task created",
      description: "Your task has been created successfully."
    });
    
    setNewTask({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      userId: user?.id || 0
    });
    
    setIsDialogOpen(false);
  };

  const handleUpdateTask = () => {
    if (!editingTask) return;
    
    if (!editingTask.title.trim()) {
      toast({
        variant: "destructive",
        title: "Title is required",
        description: "Please enter a title for your task."
      });
      return;
    }
    
    // Uncomment this when the backend API is ready
    // updateTaskMutation.mutate(editingTask);
    
    // For now, let's simulate task update since we don't have a backend yet
    const updatedTask = {
      ...editingTask,
      updatedAt: new Date().toISOString()
    };
    
    queryClient.setQueryData<Task[]>(['/api/tasks'], (old = []) => 
      old.map(task => task.id === updatedTask.id ? updatedTask : task)
    );
    
    toast({
      title: "Task updated",
      description: "Your task has been updated successfully."
    });
    
    setEditingTask(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      // Uncomment this when the backend API is ready
      // deleteTaskMutation.mutate(taskId);
      
      // For now, let's simulate task deletion since we don't have a backend yet
      queryClient.setQueryData<Task[]>(['/api/tasks'], (old = []) => 
        old.filter(task => task.id !== taskId)
      );
      
      toast({
        title: "Task deleted",
        description: "Your task has been deleted successfully."
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: "todo" | "inprogress" | "done") => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    if (draggedTask.status === status) return;
    
    const updatedTask = {
      ...draggedTask,
      status,
      updatedAt: new Date().toISOString()
    };
    
    // Uncomment this when the backend API is ready
    // updateTaskMutation.mutate(updatedTask);
    
    // For now, let's simulate task update since we don't have a backend yet
    queryClient.setQueryData<Task[]>(['/api/tasks'], (old = []) => 
      old.map(task => task.id === updatedTask.id ? updatedTask : task)
    );
    
    setDraggedTask(null);
  };

  const moveTask = (task: Task, newStatus: "todo" | "inprogress" | "done") => {
    if (task.status === newStatus) return;
    
    const updatedTask = {
      ...task,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
    
    // Uncomment this when the backend API is ready
    // updateTaskMutation.mutate(updatedTask);
    
    // For now, let's simulate task update since we don't have a backend yet
    queryClient.setQueryData<Task[]>(['/api/tasks'], (old = []) => 
      old.map(t => t.id === updatedTask.id ? updatedTask : t)
    );
  };

  const filterTasksByStatus = (status: "todo" | "inprogress" | "done") => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Kanban Task Board</h2>
            <p className="text-muted-foreground">Organize and manage your tasks using drag and drop</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new task</DialogTitle>
                <DialogDescription>
                  Add the details of your new task below.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">Title</label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    placeholder="Task title"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">Description</label>
                  <Textarea
                    id="description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    placeholder="Task description"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="priority" className="text-sm font-medium">Priority</label>
                  <select
                    id="priority"
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value as "low" | "medium" | "high"})}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTask}>
                  {createTaskMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit task</DialogTitle>
                <DialogDescription>
                  Update the details of your task below.
                </DialogDescription>
              </DialogHeader>
              {editingTask && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="edit-title" className="text-sm font-medium">Title</label>
                    <Input
                      id="edit-title"
                      value={editingTask.title}
                      onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                      placeholder="Task title"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="edit-description" className="text-sm font-medium">Description</label>
                    <Textarea
                      id="edit-description"
                      value={editingTask.description}
                      onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                      placeholder="Task description"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="edit-priority" className="text-sm font-medium">Priority</label>
                    <select
                      id="edit-priority"
                      value={editingTask.priority}
                      onChange={(e) => setEditingTask({...editingTask, priority: e.target.value as "low" | "medium" | "high"})}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="edit-status" className="text-sm font-medium">Status</label>
                    <select
                      id="edit-status"
                      value={editingTask.status}
                      onChange={(e) => setEditingTask({...editingTask, status: e.target.value as "todo" | "inprogress" | "done"})}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="todo">To Do</option>
                      <option value="inprogress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateTask}>
                  {updateTaskMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PencilLine className="mr-2 h-4 w-4" />
                  )}
                  Update Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* To Do Column */}
          <div 
            className="space-y-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "todo")}
          >
            <div className="bg-background p-4 rounded-t-lg border-b">
              <h3 className="font-medium flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                To Do
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 dark:bg-blue-900 dark:text-blue-200">
                  {filterTasksByStatus("todo").length}
                </span>
              </h3>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {filterTasksByStatus("todo").map((task) => (
                <Card 
                  key={task.id}
                  className="cursor-move shadow-sm hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                >
                  <CardHeader className="p-3 pb-0">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoveHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => moveTask(task, "todo")}
                            disabled={task.status === "todo"}
                          >
                            Move to Todo
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => moveTask(task, "inprogress")}
                            disabled={task.status === "inprogress"}
                          >
                            Move to In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => moveTask(task, "done")}
                            disabled={task.status === "done"}
                          >
                            Move to Done
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {task.description || "No description provided."}
                    </p>
                    <div className="mt-2 flex justify-between items-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingTask(task);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filterTasksByStatus("todo").length === 0 && (
                <div className="flex flex-col items-center justify-center h-24 border border-dashed rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">No tasks in this column</p>
                </div>
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div 
            className="space-y-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "inprogress")}
          >
            <div className="bg-background p-4 rounded-t-lg border-b">
              <h3 className="font-medium flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                In Progress
                <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 dark:bg-yellow-900 dark:text-yellow-200">
                  {filterTasksByStatus("inprogress").length}
                </span>
              </h3>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {filterTasksByStatus("inprogress").map((task) => (
                <Card 
                  key={task.id}
                  className="cursor-move shadow-sm hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                >
                  <CardHeader className="p-3 pb-0">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoveHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => moveTask(task, "todo")}
                            disabled={task.status === "todo"}
                          >
                            Move to Todo
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => moveTask(task, "inprogress")}
                            disabled={task.status === "inprogress"}
                          >
                            Move to In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => moveTask(task, "done")}
                            disabled={task.status === "done"}
                          >
                            Move to Done
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {task.description || "No description provided."}
                    </p>
                    <div className="mt-2 flex justify-between items-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingTask(task);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filterTasksByStatus("inprogress").length === 0 && (
                <div className="flex flex-col items-center justify-center h-24 border border-dashed rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">No tasks in this column</p>
                </div>
              )}
            </div>
          </div>

          {/* Done Column */}
          <div 
            className="space-y-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "done")}
          >
            <div className="bg-background p-4 rounded-t-lg border-b">
              <h3 className="font-medium flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                Done
                <span className="ml-2 text-xs bg-green-100 text-green-800 rounded-full px-2 py-0.5 dark:bg-green-900 dark:text-green-200">
                  {filterTasksByStatus("done").length}
                </span>
              </h3>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {filterTasksByStatus("done").map((task) => (
                <Card 
                  key={task.id}
                  className="cursor-move shadow-sm hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                >
                  <CardHeader className="p-3 pb-0">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoveHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => moveTask(task, "todo")}
                            disabled={task.status === "todo"}
                          >
                            Move to Todo
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => moveTask(task, "inprogress")}
                            disabled={task.status === "inprogress"}
                          >
                            Move to In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => moveTask(task, "done")}
                            disabled={task.status === "done"}
                          >
                            Move to Done
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {task.description || "No description provided."}
                    </p>
                    <div className="mt-2 flex justify-between items-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingTask(task);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filterTasksByStatus("done").length === 0 && (
                <div className="flex flex-col items-center justify-center h-24 border border-dashed rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">No tasks in this column</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}