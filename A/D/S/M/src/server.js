require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Internal imports
const logger = require('./lib/logger');
const dbClient = require('./db/client');
const metrics = require('./lib/Metrics');
const { errorHandler } = require('./lib/ErrorHandler');
const AgentBroadcaster = require('./lib/AgentBroadcaster');

// Routes
const jobsRouter = require('./routes/jobs');

/**
 * DealScout Express Server
 */
class DealScoutServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.port = process.env.PORT || 3001;
    
    // Initialize broadcaster
    this.broadcaster = new AgentBroadcaster(this.server);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupGracefulShutdown();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['http://localhost:3000'] 
        : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 3600000, // 1 hour
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      message: {
        success: false,
        error: 'Too many requests, please try again later',
        retryAfter: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Metrics middleware
    this.app.use(metrics.expressMiddleware());

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.headers['x-user-id']
      });
      next();
    });

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      this.app.use(express.static(path.join(__dirname, '../frontend/dist')));
    }
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await dbClient.healthCheck();
        const broadcasterStats = this.broadcaster.getStats();
        
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          uptime: process.uptime(),
          database: dbHealth,
          broadcaster: broadcasterStats,
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        };

        // Check if any component is unhealthy
        if (dbHealth.status !== 'healthy') {
          health.status = 'unhealthy';
          return res.status(503).json(health);
        }

        res.json(health);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Metrics endpoint for Prometheus
    this.app.get('/metrics', async (req, res) => {
      try {
        const metricsData = await metrics.getMetrics();
        res.set('Content-Type', metrics.getRegister().contentType);
        res.send(metricsData);
      } catch (error) {
        logger.error('Failed to get metrics:', error);
        res.status(500).json({ error: 'Failed to retrieve metrics' });
      }
    });

    // API routes
    this.app.use('/api/jobs', jobsRouter);

    // Root endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'DealScout API',
        version: '1.0.0',
        description: 'Autonomous E-commerce Intelligence Agent',
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          jobs: '/api/jobs',
          websocket: '/socket.io'
        },
        timestamp: new Date().toISOString()
      });
    });

    // Serve React app in production
    if (process.env.NODE_ENV === 'production') {
      this.app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
      });
    }

    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        path: req.path,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // Handle unhandled promise rejections
    errorHandler.handleUnhandledRejection();
    
    // Handle uncaught exceptions
    errorHandler.handleUncaughtException();

    // Express error handler (must be last)
    this.app.use(errorHandler.expressErrorHandler());
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        this.server.close(() => {
          logger.info('HTTP server closed');
        });

        // Close broadcaster
        await this.broadcaster.close();

        // Close database connections
        await dbClient.end();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Initialize database schema
   */
  async initializeDatabase() {
    try {
      // Schema is already initialized by Docker during postgres startup
      // via volume mount: ./src/db/schema.sql:/docker-entrypoint-initdb.d/schema.sql
      // Just verify connection
      await dbClient.testConnection();
      logger.info('Database connection verified successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Initialize database
      await this.initializeDatabase();

      // Start server
      this.server.listen(this.port, () => {
        logger.info(`DealScout server started on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`Process ID: ${process.pid}`);
        logger.info(`Health check: http://localhost:${this.port}/health`);
        logger.info(`Metrics: http://localhost:${this.port}/metrics`);
        logger.info(`API: http://localhost:${this.port}/api`);
        
        if (process.env.NODE_ENV !== 'production') {
          logger.info(`Frontend dev server should be running on port ${process.env.FRONTEND_PORT || 3000}`);
        }
      });

      // Update business metrics periodically
      this.startMetricsUpdater();

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Start periodic metrics updates
   */
  startMetricsUpdater() {
    setInterval(async () => {
      try {
        // Update database connection metrics
        const dbStats = await dbClient.getStats();
        if (dbStats.pool) {
          metrics.updateDatabaseConnections(
            dbStats.pool.totalCount || 0,
            dbStats.pool.idleCount || 0,
            dbStats.pool.waitingCount || 0
          );
        }

        // Update business metrics
        const businessStats = await this.getBusinessStats();
        metrics.updateBusinessMetrics(
          businessStats.jobs,
          businessStats.costSavings,
          businessStats.roi
        );

      } catch (error) {
        logger.warn('Failed to update metrics:', error.message);
      }
    }, 30000); // Update every 30 seconds
  }

  /**
   * Get business statistics
   */
  async getBusinessStats() {
    try {
      const jobStats = await dbClient.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM monitoring_jobs 
        GROUP BY status
      `);

      const jobs = {};
      jobStats.rows.forEach(row => {
        jobs[row.status] = parseInt(row.count);
      });

      // Calculate ROI metrics
      const manualHoursPerWeek = 20;
      const hourlyRate = 25;
      const monthlyCost = 200;
      const weeklySavings = manualHoursPerWeek * hourlyRate;
      const monthlySavings = weeklySavings * 4.33;
      const roi = ((monthlySavings - monthlyCost) / monthlyCost) * 100;

      return {
        jobs,
        costSavings: {
          monthly: monthlySavings,
          yearly: monthlySavings * 12
        },
        roi
      };
    } catch (error) {
      logger.warn('Failed to get business stats:', error.message);
      return { jobs: {}, costSavings: {}, roi: 0 };
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new DealScoutServer();
  server.start();
}

module.exports = DealScoutServer;