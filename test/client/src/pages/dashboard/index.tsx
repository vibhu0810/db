import React from 'react';
import { Link } from 'wouter';

const TestDashboard: React.FC = () => {
  return (
    <div className="test-dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Test Environment Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome to the test environment for the SaaS×Links platform
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <h2 className="card-header">Test Environment Overview</h2>
            <p>
              This is a dedicated testing environment for the SaaS×Links platform. It provides a sandbox
              for testing new features and functionality before they are integrated into the main application.
            </p>
            <div className="mt-4">
              <p>Available test features:</p>
              <ul className="list-disc ml-6 mt-2">
                <li>User authentication (login/register)</li>
                <li>Role-based access control</li>
                <li>Domain inventory management</li>
                <li>Order processing workflow</li>
                <li>Feedback collection system</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="card" style={{ flex: 1 }}>
              <h2 className="card-header">Quick Links</h2>
              <div className="flex flex-col gap-2">
                <Link href="/test/login">
                  <a className="btn btn-primary">Log In</a>
                </Link>
                <Link href="/test/register">
                  <a className="btn btn-outline">Register</a>
                </Link>
              </div>
            </div>
            
            <div className="card" style={{ flex: 1 }}>
              <h2 className="card-header">Test Environment Status</h2>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span>Database:</span>
                  <span className="text-green-500">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>API Server:</span>
                  <span className="text-green-500">Running</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Authentication:</span>
                  <span className="text-green-500">Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestDashboard;