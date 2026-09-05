const client = require('prom-client');
const logger = require('./logger');

/**
 * Prometheus metrics collection for DealScout
 */
class Metrics {
  constructor() {
    // Create a Registry to register the metrics
    this.register = new client.Registry();
    
    // Add default metrics
    client.collectDefaultMetrics({
      register: this.register,
      prefix: 'dealscout_'
    });

    this.initializeMetrics();
  }

  /**
   * Initialize custom metrics
   */
  initializeMetrics() {
    // HTTP request metrics
    this.httpRequestDuration = new client.Histogram({
      name: 'dealscout_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.httpRequestTotal = new client.Counter({
      name: 'dealscout_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    // Job execution metrics
    this.jobExecutionDuration = new client.Histogram({
      name: 'dealscout_job_execution_duration_seconds',
      help: 'Duration of job executions in seconds',
      labelNames: ['job_id', 'job_name', 'status'],
      buckets: [10, 30, 60, 120, 300, 600, 1200, 1800, 3600]
    });

    this.jobExecutionTotal = new client.Counter({
      name: 'dealscout_job_executions_total',
      help: 'Total number of job executions',
      labelNames: ['job_id', 'job_name', 'status']
    });

    this.productsExtracted = new client.Counter({
      name: 'dealscout_products_extracted_total',
      help: 'Total number of products extracted',
      labelNames: ['job_id', 'job_name']
    });

    // Price alert metrics
    this.priceAlerts = new client.Counter({
      name: 'dealscout_price_alerts_total',
      help: 'Total number of price alerts generated',
      labelNames: ['job_id', 'alert_type']
    });

    this.priceChanges = new client.Histogram({
      name: 'dealscout_price_changes_percent',
      help: 'Price change percentages',
      labelNames: ['job_id', 'product_url', 'change_type'],
      buckets: [0.01, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5, 0.7, 1.0]
    });

    // TinyFish API metrics
    this.tinyFishApiCalls = new client.Counter({
      name: 'dealscout_tinyfish_api_calls_total',
      help: 'Total number of TinyFish API calls',
      labelNames: ['method', 'status']
    });

    this.tinyFishApiDuration = new client.Histogram({
      name: 'dealscout_tinyfish_api_duration_seconds',
      help: 'Duration of TinyFish API calls in seconds',
      labelNames: ['method'],
      buckets: [0.5, 1, 2, 5, 10, 15, 30, 60]
    });

    this.tinyFishApiErrors = new client.Counter({
      name: 'dealscout_tinyfish_api_errors_total',
      help: 'Total number of TinyFish API errors',
      labelNames: ['method', 'error_type']
    });

    // Session metrics
    this.activeSessions = new client.Gauge({
      name: 'dealscout_active_sessions',
      help: 'Number of active browser sessions'
    });

    this.sessionDuration = new client.Histogram({
      name: 'dealscout_session_duration_seconds',
      help: 'Duration of browser sessions in seconds',
      buckets: [60, 300, 600, 1200, 1800, 3600, 7200]
    });

    // Queue metrics
    this.queueSize = new client.Gauge({
      name: 'dealscout_queue_size',
      help: 'Number of jobs in queue',
      labelNames: ['status']
    });

    this.queueProcessingTime = new client.Histogram({
      name: 'dealscout_queue_processing_time_seconds',
      help: 'Time jobs spend in queue before processing',
      buckets: [1, 5, 10, 30, 60, 300, 600, 1800]
    });

    // Database metrics
    this.databaseConnections = new client.Gauge({
      name: 'dealscout_database_connections',
      help: 'Number of database connections',
      labelNames: ['status']
    });

    this.databaseQueryDuration = new client.Histogram({
      name: 'dealscout_database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    // Business metrics
    this.totalJobs = new client.Gauge({
      name: 'dealscout_total_jobs',
      help: 'Total number of monitoring jobs',
      labelNames: ['status']
    });

    this.costSavings = new client.Gauge({
      name: 'dealscout_cost_savings_dollars',
      help: 'Estimated cost savings in dollars',
      labelNames: ['period']
    });

    this.roi = new client.Gauge({
      name: 'dealscout_roi_percent',
      help: 'Return on investment percentage'
    });

    // Error metrics
    this.errors = new client.Counter({
      name: 'dealscout_errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'component']
    });

    this.circuitBreakerState = new client.Gauge({
      name: 'dealscout_circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
      labelNames: ['service']
    });

    // Register all metrics
    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpRequestTotal);
    this.register.registerMetric(this.jobExecutionDuration);
    this.register.registerMetric(this.jobExecutionTotal);
    this.register.registerMetric(this.productsExtracted);
    this.register.registerMetric(this.priceAlerts);
    this.register.registerMetric(this.priceChanges);
    this.register.registerMetric(this.tinyFishApiCalls);
    this.register.registerMetric(this.tinyFishApiDuration);
    this.register.registerMetric(this.tinyFishApiErrors);
    this.register.registerMetric(this.activeSessions);
    this.register.registerMetric(this.sessionDuration);
    this.register.registerMetric(this.queueSize);
    this.register.registerMetric(this.queueProcessingTime);
    this.register.registerMetric(this.databaseConnections);
    this.register.registerMetric(this.databaseQueryDuration);
    this.register.registerMetric(this.totalJobs);
    this.register.registerMetric(this.costSavings);
    this.register.registerMetric(this.roi);
    this.register.registerMetric(this.errors);
    this.register.registerMetric(this.circuitBreakerState);

    logger.info('Prometheus metrics initialized');
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method, route, statusCode, duration) {
    this.httpRequestDuration
      .labels(method, route, statusCode)
      .observe(duration / 1000);
    
    this.httpRequestTotal
      .labels(method, route, statusCode)
      .inc();
  }

  /**
   * Record job execution metrics
   */
  recordJobExecution(jobId, jobName, status, duration, productsFound = 0) {
    this.jobExecutionDuration
      .labels(jobId, jobName, status)
      .observe(duration / 1000);
    
    this.jobExecutionTotal
      .labels(jobId, jobName, status)
      .inc();

    if (productsFound > 0) {
      this.productsExtracted
        .labels(jobId, jobName)
        .inc(productsFound);
    }
  }

  /**
   * Record price alert
   */
  recordPriceAlert(jobId, alertType, changePercent) {
    this.priceAlerts
      .labels(jobId, alertType)
      .inc();

    const changeType = changePercent > 0 ? 'increase' : 'decrease';
    this.priceChanges
      .labels(jobId, 'unknown', changeType)
      .observe(Math.abs(changePercent));
  }

  /**
   * Record TinyFish API call
   */
  recordTinyFishApiCall(method, status, duration, errorType = null) {
    this.tinyFishApiCalls
      .labels(method, status)
      .inc();

    this.tinyFishApiDuration
      .labels(method)
      .observe(duration / 1000);

    if (errorType) {
      this.tinyFishApiErrors
        .labels(method, errorType)
        .inc();
    }
  }

  /**
   * Update session metrics
   */
  updateSessionMetrics(activeCount) {
    this.activeSessions.set(activeCount);
  }

  /**
   * Record session duration
   */
  recordSessionDuration(duration) {
    this.sessionDuration.observe(duration / 1000);
  }

  /**
   * Update queue metrics
   */
  updateQueueMetrics(waiting, active, completed, failed, delayed) {
    this.queueSize.labels('waiting').set(waiting);
    this.queueSize.labels('active').set(active);
    this.queueSize.labels('completed').set(completed);
    this.queueSize.labels('failed').set(failed);
    this.queueSize.labels('delayed').set(delayed);
  }

  /**
   * Record queue processing time
   */
  recordQueueProcessingTime(duration) {
    this.queueProcessingTime.observe(duration / 1000);
  }

  /**
   * Update database connection metrics
   */
  updateDatabaseConnections(total, idle, waiting) {
    this.databaseConnections.labels('total').set(total);
    this.databaseConnections.labels('idle').set(idle);
    this.databaseConnections.labels('waiting').set(waiting);
  }

  /**
   * Record database query duration
   */
  recordDatabaseQuery(operation, duration) {
    this.databaseQueryDuration
      .labels(operation)
      .observe(duration / 1000);
  }

  /**
   * Update business metrics
   */
  updateBusinessMetrics(jobStats, costSavings, roi) {
    if (jobStats) {
      Object.entries(jobStats).forEach(([status, count]) => {
        this.totalJobs.labels(status).set(count);
      });
    }

    if (costSavings) {
      this.costSavings.labels('monthly').set(costSavings.monthly || 0);
      this.costSavings.labels('yearly').set(costSavings.yearly || 0);
    }

    if (roi !== undefined) {
      this.roi.set(roi);
    }
  }

  /**
   * Record error
   */
  recordError(type, component) {
    this.errors.labels(type, component).inc();
  }

  /**
   * Update circuit breaker state
   */
  updateCircuitBreakerState(service, state) {
    const stateValue = state === 'CLOSED' ? 0 : state === 'OPEN' ? 1 : 2;
    this.circuitBreakerState.labels(service).set(stateValue);
  }

  /**
   * Express middleware for HTTP metrics
   */
  expressMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const route = req.route?.path || req.path || 'unknown';
        this.recordHttpRequest(req.method, route, res.statusCode, duration);
      });
      
      next();
    };
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics() {
    return await this.register.metrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsAsJson() {
    const metrics = await this.register.getMetricsAsJSON();
    return metrics;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.register.clear();
    logger.info('All metrics cleared');
  }

  /**
   * Get registry for custom use
   */
  getRegister() {
    return this.register;
  }
}

// Export singleton instance
const metrics = new Metrics();

module.exports = metrics;