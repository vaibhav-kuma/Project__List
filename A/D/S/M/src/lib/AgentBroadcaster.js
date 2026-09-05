const { Server } = require('socket.io');
const logger = require('./logger');

/**
 * Agent broadcaster for live streaming agent actions and screenshots
 */
class AgentBroadcaster {
  constructor(httpServer = null) {
    this.io = null;
    this.namespaces = new Map();
    this.screenshotIntervals = new Map();
    
    if (httpServer) {
      this.initialize(httpServer);
    }
  }

  /**
   * Initialize Socket.io server
   */
  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.setupGlobalHandlers();
    logger.info('Agent broadcaster initialized');
  }

  /**
   * Setup global Socket.io event handlers
   */
  setupGlobalHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Get or create namespace for specific job
   */
  getNamespace(namespacePath) {
    if (!this.io) {
      // Return mock namespace if not initialized
      return {
        emit: () => {},
        on: () => {},
        to: () => ({ emit: () => {} })
      };
    }

    if (this.namespaces.has(namespacePath)) {
      return this.namespaces.get(namespacePath);
    }

    const namespace = this.io.of(namespacePath);
    this.namespaces.set(namespacePath, namespace);

    this.setupNamespaceHandlers(namespace, namespacePath);
    return namespace;
  }

  /**
   * Setup handlers for job-specific namespace
   */
  setupNamespaceHandlers(namespace, namespacePath) {
    namespace.on('connection', (socket) => {
      const jobId = namespacePath.split('/').pop();
      logger.info(`Client connected to job ${jobId}: ${socket.id}`);

      // Send connection confirmation
      socket.emit('connected', {
        jobId,
        timestamp: Date.now(),
        message: 'Connected to live agent viewer'
      });

      // Handle screenshot requests
      socket.on('request-screenshot', (data) => {
        this.handleScreenshotRequest(socket, jobId, data);
      });

      // Handle action log requests
      socket.on('request-action-log', (data) => {
        this.handleActionLogRequest(socket, jobId, data);
      });

      // Start periodic screenshots if requested
      socket.on('start-live-view', (data) => {
        this.startLiveView(socket, jobId, data);
      });

      // Stop periodic screenshots
      socket.on('stop-live-view', () => {
        this.stopLiveView(socket, jobId);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected from job ${jobId}: ${socket.id}`);
        this.stopLiveView(socket, jobId);
      });
    });
  }

  /**
   * Broadcast agent action to namespace
   */
  broadcastAction(namespacePath, action, data = {}) {
    const namespace = this.getNamespace(namespacePath);
    
    const actionData = {
      timestamp: Date.now(),
      action,
      data,
      type: 'agent-action'
    };

    namespace.emit('agent-action', actionData);
    logger.debug(`Broadcasted action to ${namespacePath}:`, action);
  }

  /**
   * Broadcast screenshot to namespace
   */
  broadcastScreenshot(namespacePath, screenshotData, metadata = {}) {
    const namespace = this.getNamespace(namespacePath);
    
    const screenshotPayload = {
      timestamp: Date.now(),
      screenshot: screenshotData,
      metadata,
      type: 'screenshot'
    };

    namespace.emit('screenshot', screenshotPayload);
    logger.debug(`Broadcasted screenshot to ${namespacePath}`);
  }

  /**
   * Broadcast job status update
   */
  broadcastJobStatus(namespacePath, status, data = {}) {
    const namespace = this.getNamespace(namespacePath);
    
    const statusData = {
      timestamp: Date.now(),
      status,
      data,
      type: 'job-status'
    };

    namespace.emit('job-status', statusData);
    logger.info(`Broadcasted job status to ${namespacePath}:`, status);
  }

  /**
   * Broadcast price alert
   */
  broadcastPriceAlert(namespacePath, alert) {
    const namespace = this.getNamespace(namespacePath);
    
    const alertData = {
      timestamp: Date.now(),
      alert,
      type: 'price-alert'
    };

    namespace.emit('price-alert', alertData);
    logger.info(`Broadcasted price alert to ${namespacePath}:`, alert.productTitle);
  }

  /**
   * Handle screenshot request from client
   */
  async handleScreenshotRequest(socket, jobId, data) {
    try {
      // This would be called by the agent when it has a screenshot
      // For now, acknowledge the request
      socket.emit('screenshot-requested', {
        jobId,
        timestamp: Date.now(),
        message: 'Screenshot request received'
      });
    } catch (error) {
      logger.error(`Screenshot request failed for job ${jobId}:`, error);
      socket.emit('error', {
        type: 'screenshot-error',
        message: error.message
      });
    }
  }

  /**
   * Handle action log request from client
   */
  async handleActionLogRequest(socket, jobId, data) {
    try {
      // Send recent actions (this would come from a database or cache)
      const recentActions = this.getRecentActions(jobId, data.limit || 50);
      
      socket.emit('action-log', {
        jobId,
        actions: recentActions,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Action log request failed for job ${jobId}:`, error);
      socket.emit('error', {
        type: 'action-log-error',
        message: error.message
      });
    }
  }

  /**
   * Start live view with periodic screenshots
   */
  startLiveView(socket, jobId, options = {}) {
    const intervalMs = options.interval || 2000; // 2 seconds default
    const intervalKey = `${socket.id}-${jobId}`;

    // Clear existing interval if any
    this.stopLiveView(socket, jobId);

    // Start new interval
    const interval = setInterval(() => {
      // This would trigger a screenshot request to the active agent
      socket.emit('live-view-tick', {
        jobId,
        timestamp: Date.now(),
        interval: intervalMs
      });
    }, intervalMs);

    this.screenshotIntervals.set(intervalKey, interval);
    
    socket.emit('live-view-started', {
      jobId,
      interval: intervalMs,
      timestamp: Date.now()
    });

    logger.info(`Started live view for job ${jobId}, client ${socket.id}`);
  }

  /**
   * Stop live view
   */
  stopLiveView(socket, jobId) {
    const intervalKey = `${socket.id}-${jobId}`;
    
    if (this.screenshotIntervals.has(intervalKey)) {
      clearInterval(this.screenshotIntervals.get(intervalKey));
      this.screenshotIntervals.delete(intervalKey);
      
      socket.emit('live-view-stopped', {
        jobId,
        timestamp: Date.now()
      });

      logger.info(`Stopped live view for job ${jobId}, client ${socket.id}`);
    }
  }

  /**
   * Get recent actions for a job (mock implementation)
   */
  getRecentActions(jobId, limit = 50) {
    // In a real implementation, this would query a database or cache
    return [
      {
        timestamp: Date.now() - 30000,
        action: 'login-start',
        data: { email: 'user@example.com' }
      },
      {
        timestamp: Date.now() - 25000,
        action: 'login-success',
        data: { method: 'session-restore' }
      },
      {
        timestamp: Date.now() - 20000,
        action: 'search-start',
        data: { query: 'wireless headphones' }
      },
      {
        timestamp: Date.now() - 15000,
        action: 'filters-applied',
        data: { priceMax: 100, primeOnly: true }
      },
      {
        timestamp: Date.now() - 10000,
        action: 'extraction-page',
        data: { page: 1, count: 16 }
      }
    ].slice(0, limit);
  }

  /**
   * Get connection statistics
   */
  getStats() {
    if (!this.io) {
      return { connected: 0, namespaces: 0 };
    }

    const stats = {
      connected: this.io.engine.clientsCount,
      namespaces: this.namespaces.size,
      activeIntervals: this.screenshotIntervals.size
    };

    return stats;
  }

  /**
   * Cleanup and close all connections
   */
  async close() {
    try {
      // Clear all screenshot intervals
      for (const interval of this.screenshotIntervals.values()) {
        clearInterval(interval);
      }
      this.screenshotIntervals.clear();

      // Close Socket.io server
      if (this.io) {
        await new Promise((resolve) => {
          this.io.close(resolve);
        });
      }

      this.namespaces.clear();
      logger.info('Agent broadcaster closed');
    } catch (error) {
      logger.error('Error closing agent broadcaster:', error);
    }
  }
}

module.exports = AgentBroadcaster;