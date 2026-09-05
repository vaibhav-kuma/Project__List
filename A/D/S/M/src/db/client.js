const { Pool } = require('pg');
const logger = require('../lib/logger');

/**
 * PostgreSQL database client with connection pooling and query logging
 */
class DatabaseClient {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'dealscout',
      user: process.env.DB_USER || 'dealscout',
      password: process.env.DB_PASSWORD || 'dealscout123',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
    });

    this.setupEventHandlers();
    this.testConnection();
  }

  /**
   * Setup pool event handlers
   */
  setupEventHandlers() {
    this.pool.on('connect', (client) => {
      logger.debug('New database client connected');
    });

    this.pool.on('acquire', (client) => {
      logger.debug('Client acquired from pool');
    });

    this.pool.on('remove', (client) => {
      logger.debug('Client removed from pool');
    });

    this.pool.on('error', (err, client) => {
      logger.error('Unexpected error on idle client:', err);
    });
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      client.release();
      
      logger.info('Database connection successful:', {
        time: result.rows[0].current_time,
        version: result.rows[0].version.split(' ')[0]
      });
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Execute a query with logging and error handling
   */
  async query(text, params = []) {
    const start = Date.now();
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Query executed:', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Query failed:', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params.length > 0 ? '[PARAMS]' : 'none',
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction(queries) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const results = [];
      
      for (const { text, params = [] } of queries) {
        const result = await client.query(text, params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      logger.debug(`Transaction completed with ${queries.length} queries`);
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed, rolled back:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a query with a specific client (for transactions)
   */
  async queryWithClient(client, text, params = []) {
    const start = Date.now();
    
    try {
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Client query executed:', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Client query failed:', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a client for manual transaction management
   */
  async getClient() {
    return await this.pool.connect();
  }

  /**
   * Initialize database schema
   */
  async initializeSchema() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');
      
      // Split schema into individual statements, handling PostgreSQL $$ markers
      const statements = [];
      let current = '';
      let inDollarQuote = false;
      let dollarQuoteMarker = '';
      
      for (let i = 0; i < schema.length; i++) {
        const char = schema[i];
        const nextChar = schema[i + 1];
        
        current += char;
        
        // Check for $$ or $identifier$ markers
        if (char === '$') {
          let j = i + 1;
          let marker = '$';
          while (j < schema.length && /[a-zA-Z0-9_]/.test(schema[j])) {
            marker += schema[j];
            j++;
          }
          if (schema[j] === '$') {
            marker += '$';
            if (inDollarQuote && marker === dollarQuoteMarker) {
              // End of dollar quote
              inDollarQuote = false;
              current += schema.substring(i + 1, j + 1);
              i = j;
            } else if (!inDollarQuote) {
              // Start of dollar quote
              inDollarQuote = true;
              dollarQuoteMarker = marker;
              current += schema.substring(i + 1, j + 1);
              i = j;
            }
          }
        } else if (char === ';' && !inDollarQuote) {
          // Statement terminator (not in dollar quote)
          const stmt = current.slice(0, -1).trim(); // Remove the semicolon
          if (stmt.length > 0 && !stmt.startsWith('--')) {
            statements.push(stmt);
          }
          current = '';
        }
      }
      
      // Add any remaining statement
      const remaining = current.trim();
      if (remaining.length > 0 && !remaining.startsWith('--')) {
        statements.push(remaining);
      }
      
      logger.info(`Executing ${statements.length} schema statements...`);
      
      for (const statement of statements) {
        try {
          await this.query(statement);
        } catch (error) {
          // Log but don't fail on already exists errors
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }
      
      logger.info('Database schema initialized successfully');
    } catch (error) {
      logger.error('Schema initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const stats = await this.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables 
        ORDER BY n_live_tup DESC
      `);

      const poolStats = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };

      return {
        pool: poolStats,
        tables: stats.rows
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return { pool: {}, tables: [] };
    }
  }

  /**
   * Health check for the database
   */
  async healthCheck() {
    try {
      const start = Date.now();
      const result = await this.query('SELECT 1 as health_check');
      const duration = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime: duration,
        connections: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connections: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount
        }
      };
    }
  }

  /**
   * Clean up old data
   */
  async cleanup(retentionDays = 90) {
    try {
      const result = await this.query('SELECT * FROM cleanup_old_data($1)', [retentionDays]);
      const stats = result.rows[0];
      
      logger.info('Database cleanup completed:', {
        snapshotsDeleted: stats.snapshots_deleted,
        executionsDeleted: stats.executions_deleted,
        sessionsDeleted: stats.sessions_deleted
      });
      
      return stats;
    } catch (error) {
      logger.error('Database cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Close all connections
   */
  async end() {
    try {
      await this.pool.end();
      logger.info('Database pool closed');
    } catch (error) {
      logger.error('Error closing database pool:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const dbClient = new DatabaseClient();

module.exports = dbClient;