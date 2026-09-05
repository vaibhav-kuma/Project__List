const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

/**
 * Session manager for cookie persistence and validation
 */
class SessionManager {
  constructor(dbClient = null) {
    this.dbClient = dbClient;
    this.sessionsDir = path.join(__dirname, '../../data/sessions');
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
    } catch (error) {
      logger.warn('Failed to create sessions directory:', error.message);
    }
  }

  /**
   * Save session cookies to persistent storage
   */
  async saveSession(sessionKey, cookies, metadata = {}) {
    const sessionData = {
      cookies,
      metadata: {
        ...metadata,
        savedAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      }
    };

    try {
      // Try database first
      if (this.dbClient) {
        await this.dbClient.query(
          'INSERT INTO sessions (session_key, cookies, metadata, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT (session_key) DO UPDATE SET cookies = $2, metadata = $3, expires_at = $4',
          [sessionKey, JSON.stringify(cookies), JSON.stringify(sessionData.metadata), new Date(sessionData.metadata.expiresAt)]
        );
        logger.info(`Saved session to database: ${sessionKey}`);
        return;
      }
    } catch (error) {
      logger.warn('Database save failed, falling back to file:', error.message);
    }

    // Fallback to file storage
    try {
      const filePath = path.join(this.sessionsDir, `${sessionKey}.json`);
      await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2));
      logger.info(`Saved session to file: ${sessionKey}`);
    } catch (error) {
      logger.error('Failed to save session:', error);
      throw error;
    }
  }

  /**
   * Load session cookies from persistent storage
   */
  async loadSession(sessionKey) {
    try {
      // Try database first
      if (this.dbClient) {
        const result = await this.dbClient.query(
          'SELECT cookies, metadata, expires_at FROM sessions WHERE session_key = $1',
          [sessionKey]
        );
        
        if (result.rows.length > 0) {
          const row = result.rows[0];
          const sessionData = {
            cookies: JSON.parse(row.cookies),
            metadata: JSON.parse(row.metadata)
          };
          
          if (this.isSessionValid(sessionData)) {
            logger.info(`Loaded session from database: ${sessionKey}`);
            return sessionData;
          } else {
            await this.deleteSession(sessionKey);
            return null;
          }
        }
      }
    } catch (error) {
      logger.warn('Database load failed, trying file:', error.message);
    }

    // Fallback to file storage
    try {
      const filePath = path.join(this.sessionsDir, `${sessionKey}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const sessionData = JSON.parse(data);
      
      if (this.isSessionValid(sessionData)) {
        logger.info(`Loaded session from file: ${sessionKey}`);
        return sessionData;
      } else {
        await this.deleteSession(sessionKey);
        return null;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to load session:', error);
      }
      return null;
    }
  }

  /**
   * Check if session is still valid (not expired)
   */
  isSessionValid(sessionData) {
    if (!sessionData || !sessionData.metadata) {
      return false;
    }
    
    const now = Date.now();
    const expiresAt = sessionData.metadata.expiresAt;
    
    return expiresAt && now < expiresAt;
  }

  /**
   * Delete expired or invalid session
   */
  async deleteSession(sessionKey) {
    try {
      // Try database first
      if (this.dbClient) {
        await this.dbClient.query('DELETE FROM sessions WHERE session_key = $1', [sessionKey]);
        logger.info(`Deleted session from database: ${sessionKey}`);
      }
    } catch (error) {
      logger.warn('Database delete failed:', error.message);
    }

    // Also try file storage
    try {
      const filePath = path.join(this.sessionsDir, `${sessionKey}.json`);
      await fs.unlink(filePath);
      logger.info(`Deleted session file: ${sessionKey}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('Failed to delete session file:', error.message);
      }
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      // Database cleanup
      if (this.dbClient) {
        const result = await this.dbClient.query('DELETE FROM sessions WHERE expires_at < NOW()');
        logger.info(`Cleaned up ${result.rowCount} expired sessions from database`);
      }

      // File cleanup
      const files = await fs.readdir(this.sessionsDir);
      let cleanedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.sessionsDir, file);
            const data = await fs.readFile(filePath, 'utf8');
            const sessionData = JSON.parse(data);
            
            if (!this.isSessionValid(sessionData)) {
              await fs.unlink(filePath);
              cleanedCount++;
            }
          } catch (error) {
            logger.warn(`Failed to process session file ${file}:`, error.message);
          }
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired session files`);
      }
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats() {
    const stats = {
      database: { total: 0, valid: 0, expired: 0 },
      files: { total: 0, valid: 0, expired: 0 }
    };

    try {
      // Database stats
      if (this.dbClient) {
        const totalResult = await this.dbClient.query('SELECT COUNT(*) FROM sessions');
        const validResult = await this.dbClient.query('SELECT COUNT(*) FROM sessions WHERE expires_at > NOW()');
        
        stats.database.total = parseInt(totalResult.rows[0].count);
        stats.database.valid = parseInt(validResult.rows[0].count);
        stats.database.expired = stats.database.total - stats.database.valid;
      }

      // File stats
      const files = await fs.readdir(this.sessionsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          stats.files.total++;
          try {
            const filePath = path.join(this.sessionsDir, file);
            const data = await fs.readFile(filePath, 'utf8');
            const sessionData = JSON.parse(data);
            
            if (this.isSessionValid(sessionData)) {
              stats.files.valid++;
            } else {
              stats.files.expired++;
            }
          } catch (error) {
            stats.files.expired++;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to get session stats:', error);
    }

    return stats;
  }
}

module.exports = SessionManager;