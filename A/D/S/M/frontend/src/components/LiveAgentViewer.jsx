import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { Play, Pause, RotateCcw, Maximize2, Minimize2, Wifi, WifiOff } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Live Agent Viewer Component - Streams agent actions and screenshots in real-time
 */
const LiveAgentViewer = ({ jobId }) => {
  const [isLiveViewActive, setIsLiveViewActive] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const socket = useSocket();
  const actionLogRef = useRef(null);
  const screenshotRef = useRef(null);

  // Connect to job-specific namespace
  useEffect(() => {
    if (!socket || !jobId) return;

    const namespace = `/agent/${jobId}`;
    const jobSocket = socket.io.of ? socket.io.of(namespace) : socket;

    // Connection handlers
    const handleConnect = () => {
      setConnectionStatus('connected');
      console.log(`Connected to agent namespace: ${namespace}`);
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
      setIsLiveViewActive(false);
    };

    const handleConnected = (data) => {
      setConnectionStatus('connected');
      addActionLog('system', 'Connected to live agent viewer', data);
    };

    // Agent action handlers
    const handleAgentAction = (data) => {
      addActionLog('action', data.action, data.data);
    };

    const handleScreenshot = (data) => {
      setCurrentScreenshot(data.screenshot);
    };

    const handleJobStatus = (data) => {
      addActionLog('status', `Job ${data.status}`, data.data);
    };

    const handlePriceAlert = (data) => {
      addActionLog('alert', 'Price Alert', data.alert);
    };

    const handleJobError = (data) => {
      addActionLog('error', 'Job Error', { error: data.error });
    };

    // Set up event listeners
    jobSocket.on('connect', handleConnect);
    jobSocket.on('disconnect', handleDisconnect);
    jobSocket.on('connected', handleConnected);
    jobSocket.on('agent-action', handleAgentAction);
    jobSocket.on('screenshot', handleScreenshot);
    jobSocket.on('job-status', handleJobStatus);
    jobSocket.on('price-alert', handlePriceAlert);
    jobSocket.on('job-error', handleJobError);

    // Cleanup
    return () => {
      jobSocket.off('connect', handleConnect);
      jobSocket.off('disconnect', handleDisconnect);
      jobSocket.off('connected', handleConnected);
      jobSocket.off('agent-action', handleAgentAction);
      jobSocket.off('screenshot', handleScreenshot);
      jobSocket.off('job-status', handleJobStatus);
      jobSocket.off('price-alert', handlePriceAlert);
      jobSocket.off('job-error', handleJobError);
    };
  }, [socket, jobId]);

  // Auto-scroll action log
  useEffect(() => {
    if (autoScroll && actionLogRef.current) {
      actionLogRef.current.scrollTop = actionLogRef.current.scrollHeight;
    }
  }, [actionLog, autoScroll]);

  // Add action to log
  const addActionLog = (type, action, data = {}) => {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      type,
      action,
      data
    };
    
    setActionLog(prev => [...prev.slice(-99), logEntry]); // Keep last 100 entries
  };

  // Start/stop live view
  const toggleLiveView = () => {
    if (!socket) return;

    if (isLiveViewActive) {
      socket.emit('stop-live-view');
      setIsLiveViewActive(false);
    } else {
      socket.emit('start-live-view', { interval: 2000 });
      setIsLiveViewActive(true);
    }
  };

  // Request manual screenshot
  const requestScreenshot = () => {
    if (socket) {
      socket.emit('request-screenshot');
    }
  };

  // Clear action log
  const clearActionLog = () => {
    setActionLog([]);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Format action data for display
  const formatActionData = (data) => {
    if (!data || typeof data !== 'object') return '';
    
    const keys = Object.keys(data);
    if (keys.length === 0) return '';
    
    return keys.slice(0, 3).map(key => `${key}: ${JSON.stringify(data[key])}`).join(', ');
  };

  // Get action type styling
  const getActionTypeStyle = (type) => {
    switch (type) {
      case 'system':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'action':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'status':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'alert':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!jobId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No job selected for live viewing</p>
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <div className="flex flex-col h-full">
        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleLiveView}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isLiveViewActive
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isLiveViewActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isLiveViewActive ? 'Stop Live View' : 'Start Live View'}</span>
            </button>

            <button
              onClick={requestScreenshot}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Screenshot</span>
            </button>

            <button
              onClick={clearActionLog}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Log
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              connectionStatus === 'connected'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {connectionStatus === 'connected' ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              <span className="capitalize">{connectionStatus}</span>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 grid ${isFullscreen ? 'grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'} gap-4 p-4`}>
          {/* Screenshot Viewer */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-medium text-gray-900">Live Screenshot</h3>
              <p className="text-sm text-gray-600">Real-time agent browser view</p>
            </div>
            
            <div className="p-4 bg-gray-100 min-h-96 flex items-center justify-center">
              {currentScreenshot ? (
                <img
                  ref={screenshotRef}
                  src={`data:image/jpeg;base64,${currentScreenshot}`}
                  alt="Agent Screenshot"
                  className="max-w-full max-h-full object-contain rounded border border-gray-300 shadow-sm"
                />
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <Maximize2 className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-500">No screenshot available</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {isLiveViewActive ? 'Waiting for agent...' : 'Start live view to see screenshots'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Log */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Action Log</h3>
                <p className="text-sm text-gray-600">Real-time agent activities</p>
              </div>
              
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-600">Auto-scroll</span>
              </label>
            </div>
            
            <div
              ref={actionLogRef}
              className="flex-1 overflow-y-auto p-4 space-y-2 max-h-96"
            >
              {actionLog.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No actions logged yet</p>
                  <p className="text-sm text-gray-400 mt-1">Agent activities will appear here</p>
                </div>
              ) : (
                actionLog.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border ${getActionTypeStyle(entry.type)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{entry.action}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionTypeStyle(entry.type)}`}>
                            {entry.type}
                          </span>
                        </div>
                        
                        {entry.data && Object.keys(entry.data).length > 0 && (
                          <p className="text-sm mt-1 text-gray-700">
                            {formatActionData(entry.data)}
                          </p>
                        )}
                      </div>
                      
                      <span className="text-xs text-gray-500 ml-2">
                        {format(entry.timestamp, 'HH:mm:ss')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAgentViewer;