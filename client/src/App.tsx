import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Switch>
          <Route path="/auth">
            <div className="flex min-h-screen items-center justify-center">
              <h1>Authentication Page</h1>
            </div>
          </Route>
          <Route path="/">
            <div className="flex min-h-screen items-center justify-center">
              <h1>Dashboard</h1>
            </div>
          </Route>
        </Switch>
      </div>
    </QueryClientProvider>
  );
}

export default App;