import React from 'react';
import { Route, Switch } from 'wouter';
import { Toaster } from 'react-hot-toast';

// Test environment pages
import TestDashboard from './pages/dashboard';
import TestLogin from './pages/login';
import TestRegister from './pages/register';
import TestNotFound from './pages/not-found';

const App: React.FC = () => {
  return (
    <div className="test-environment">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        }}
      />
      <Switch>
        <Route path="/test" component={TestDashboard} />
        <Route path="/test/login" component={TestLogin} />
        <Route path="/test/register" component={TestRegister} />
        <Route component={TestNotFound} />
      </Switch>
    </div>
  );
};

export default App;