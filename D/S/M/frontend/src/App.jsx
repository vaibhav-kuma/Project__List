import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { Activity, BarChart3, Bell, Settings, Zap } from 'lucide-react';

// Components
import CreateJobForm from './components/CreateJobForm';
import JobList from './components/JobList';
import LiveAgentViewer from './components/LiveAgentViewer';
import PriceChart from './components/PriceChart';
import AlertsFeed from './components/AlertsFeed';
import ROICalculator from './components/ROICalculator';
import DashboardStats from './components/DashboardStats';

// Hooks
import { useSocket } from './hooks/useSocket';
import { useDashboardStats } from './hooks/useDashboardStats';

// Utils
import { api } from './utils/api';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 30000
    }
  }
});

/**
 * Main DealScout Dashboard Application
 */
function App() {
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Socket connection for real-time updates
  const socket = useSocket();
  
  // Dashboard statistics
  const { data: dashboardStats, refetch: refetchStats } = useDashboardStats();

  // Handle job selection
  const handleJobSelect = (job) => {
    setSelectedJob(job);
    setActiveTab('viewer');
  };

  // Handle job creation success
  const handleJobCreated = (newJob) => {
    refetchStats();
    setSelectedJob(newJob);
    setActiveTab('viewer');
  };

  // Navigation items
  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'jobs', label: 'Jobs', icon: Activity },
    { id: 'viewer', label: 'Live Viewer', icon: Zap },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-16'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className={`${sidebarOpen ? 'block' : 'hidden'}`}>
                <h1 className="text-2xl font-bold text-gray-900">DealScout</h1>
                <p className="text-sm text-gray-600">E-commerce Intelligence</p>
              </div>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Activity className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {sidebarOpen && <span className="ml-3">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Job Creation Form */}
          {sidebarOpen && activeTab === 'jobs' && (
            <div className="p-4 border-t border-gray-200">
              <CreateJobForm onJobCreated={handleJobCreated} />
            </div>
          )}

          {/* Job List */}
          {sidebarOpen && (activeTab === 'jobs' || activeTab === 'viewer') && (
            <div className="flex-1 p-4 border-t border-gray-200 overflow-y-auto">
              <JobList 
                selectedJob={selectedJob}
                onJobSelect={handleJobSelect}
                onJobUpdated={refetchStats}
              />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 capitalize">
                  {activeTab === 'viewer' && selectedJob ? selectedJob.name : activeTab}
                </h2>
                <p className="text-sm text-gray-600">
                  {activeTab === 'overview' && 'Monitor your e-commerce intelligence'}
                  {activeTab === 'jobs' && 'Manage your monitoring jobs'}
                  {activeTab === 'viewer' && selectedJob && `Job ID: ${selectedJob.id}`}
                  {activeTab === 'alerts' && 'Recent price alerts and notifications'}
                  {activeTab === 'settings' && 'Configure your preferences'}
                </p>
              </div>
              
              {/* Connection Status */}
              <div className="flex items-center space-x-4">
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                  socket?.connected 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    socket?.connected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span>{socket?.connected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <DashboardStats stats={dashboardStats} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">ROI Calculator</h3>
                    <ROICalculator stats={dashboardStats} />
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
                    <AlertsFeed limit={5} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Price Trends</h3>
                  <PriceChart />
                </div>
              </div>
            )}

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Monitoring Jobs</h3>
                  <p className="text-gray-600 mb-6">
                    Create and manage your price monitoring jobs. Select a job to view live agent activity.
                  </p>
                  
                  {!selectedJob ? (
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Select a job from the sidebar to view details</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900">{selectedJob.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{selectedJob.search_query}</p>
                        <div className="flex items-center space-x-4 mt-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedJob.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : selectedJob.status === 'paused'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedJob.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            Created: {new Date(selectedJob.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Live Viewer Tab */}
            {activeTab === 'viewer' && (
              <div className="space-y-6">
                {selectedJob ? (
                  <>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Live Agent Viewer</h3>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-sm text-gray-600">Agent Active</span>
                        </div>
                      </div>
                      <LiveAgentViewer jobId={selectedJob.id} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Price History</h3>
                        <PriceChart jobId={selectedJob.id} />
                      </div>
                      
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Job Alerts</h3>
                        <AlertsFeed jobId={selectedJob.id} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Job Selected</h3>
                    <p className="text-gray-600 mb-6">
                      Select a monitoring job from the sidebar to view live agent activity
                    </p>
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Browse Jobs
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Price Alerts</h3>
                <AlertsFeed />
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Settings</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">API Configuration</h4>
                    <p className="text-sm text-gray-600 mb-4">Configure your TinyFish API settings</p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700">
                        API settings are configured via environment variables for security.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Notifications</h4>
                    <p className="text-sm text-gray-600 mb-4">Configure alert preferences</p>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                        <span className="ml-2 text-sm text-gray-700">Email notifications for price drops</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                        <span className="ml-2 text-sm text-gray-700">Browser notifications</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </QueryClientProvider>
  );
}

export default App;