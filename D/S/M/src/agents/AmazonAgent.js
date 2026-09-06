const { TinyFishClient } = require('../lib/TinyFishClient');
const SessionManager = require('../lib/SessionManager');
const logger = require('../lib/logger');

/**
 * Amazon e-commerce agent with complete workflow automation
 */
class AmazonAgent {
  constructor(tinyFishClient, sessionManager, broadcaster = null) {
    this.client = tinyFishClient;
    this.sessionManager = sessionManager;
    this.broadcaster = broadcaster;
    this.sessionId = null;
    this.isLoggedIn = false;
    
    // Fallback selectors for robust element targeting
    this.selectors = {
      login: {
        emailInput: ['#ap_email', 'input[name="email"]', '[data-testid="email-input"]'],
        continueButton: ['#continue', '.a-button-primary input', '[data-testid="continue-button"]'],
        passwordInput: ['#ap_password', 'input[name="password"]', '[data-testid="password-input"]'],
        signInButton: ['#signInSubmit', '.a-button-primary input[type="submit"]', '[data-testid="signin-button"]'],
        captchaImage: ['#auth-captcha-image', '.cvf-widget-captcha img'],
        captchaInput: ['#auth-captcha-guess', 'input[name="cvf_captcha_input"]'],
        twoFactorInput: ['#auth-mfa-otpcode', 'input[name="otpCode"]'],
        twoFactorSubmit: ['#auth-signin-button', '.a-button-primary input']
      },
      search: {
        searchBox: ['#twotabsearchtextbox', '[data-testid="search-input"]', 'input[name="field-keywords"]'],
        searchButton: ['#nav-search-submit-button', '.nav-search-submit input', '[data-testid="search-button"]'],
        allFiltersButton: ['[data-component-type="s-filter-bar"] .a-button-text', '.s-filter-bar .a-button', '[data-testid="all-filters"]'],
        priceFilter: ['#p_36-title', '.a-section[data-cy="price-filter"]'],
        ratingFilter: ['#p_72-title', '.a-section[data-cy="rating-filter"]'],
        primeFilter: ['#p_85-title', '.a-section[data-cy="prime-filter"]'],
        applyButton: ['.a-button-primary .a-button-text', '[data-action="apply-filters"]'],
        nextButton: ['.a-pagination .a-last a', '.s-pagination-next', '[data-testid="next-page"]']
      },
      product: {
        title: ['#productTitle', '.product-title', '[data-testid="product-title"]'],
        price: ['.a-price-whole', '.a-offscreen', '.a-price .a-offscreen'],
        originalPrice: ['.a-text-price .a-offscreen', '.a-price.a-text-price'],
        rating: ['.a-icon-alt', '.a-star-rating .a-icon-alt'],
        reviewCount: ['#acrCustomerReviewText', '.a-link-normal .a-size-base'],
        image: ['#landingImage', '.a-dynamic-image', '[data-testid="product-image"]'],
        availability: ['#availability span', '.a-color-success', '.a-color-state'],
        seller: ['#sellerProfileTriggerId', '.a-link-normal[href*="seller"]'],
        shipping: ['#mir-layout-DELIVERY_BLOCK', '.a-color-secondary'],
        buyBox: ['#buy-now-button', '.a-button-primary[name="submit.buy-now"]']
      },
      results: {
        productContainer: ['[data-component-type="s-search-result"]', '.s-result-item', '.sg-col-inner'],
        title: ['h2 a span', '.a-size-medium span', '[data-cy="title-recipe-title"]'],
        price: ['.a-price-whole', '.a-offscreen', '.a-price .a-offscreen'],
        rating: ['.a-icon-alt', '.a-star-rating .a-icon-alt'],
        reviewCount: ['.a-link-normal .a-size-base', '.a-row .a-size-base'],
        image: ['.s-image', '.a-dynamic-image'],
        link: ['h2 a', '.a-link-normal[href*="/dp/"]'],
        prime: ['.a-icon-prime', '[aria-label*="Prime"]'],
        sponsored: ['.s-sponsored-label-text', '[data-cy="sponsored-label"]']
      }
    };
  }

  /**
   * Broadcast action to live viewer
   */
  broadcast(action, data = {}) {
    if (this.broadcaster) {
      this.broadcaster.emit('agent-action', {
        timestamp: Date.now(),
        action,
        data,
        sessionId: this.sessionId
      });
    }
    logger.info(`Action: ${action}`, data);
  }

  /**
   * Login to Amazon with session persistence
   */
  async login(email, password) {
    try {
      this.broadcast('login-start', { email });
      
      // Try to load existing session
      const sessionKey = `amazon_${email.replace('@', '_')}`;
      const existingSession = await this.sessionManager.loadSession(sessionKey);
      
      if (existingSession) {
        this.broadcast('session-restore', { sessionKey });
        this.sessionId = await this.client.createSession();
        await this.client.setCookies(this.sessionId, existingSession.cookies);
        
        // Verify login status
        await this.client.navigate(this.sessionId, 'https://www.amazon.com/gp/css/homepage.html');
        const isLoggedIn = await this.verifyLoginStatus();
        
        if (isLoggedIn) {
          this.isLoggedIn = true;
          this.broadcast('login-success', { method: 'session-restore' });
          return true;
        }
      }

      // Fresh login required
      this.sessionId = await this.client.createSession();
      await this.client.navigate(this.sessionId, 'https://www.amazon.com/ap/signin');
      
      this.broadcast('login-form', { step: 'email' });
      
      // Enter email
      await this.client.waitForElement(this.sessionId, this.selectors.login.emailInput[0]);
      await this.client.type(this.sessionId, this.selectors.login.emailInput, email);
      await this.client.click(this.sessionId, this.selectors.login.continueButton);
      
      // Wait for password page
      await this.client.waitForElement(this.sessionId, this.selectors.login.passwordInput[0]);
      this.broadcast('login-form', { step: 'password' });
      
      // Enter password
      await this.client.type(this.sessionId, this.selectors.login.passwordInput, password);
      await this.client.click(this.sessionId, this.selectors.login.signInButton);
      
      // Handle potential 2FA/CAPTCHA
      await this.client.delay(3000);
      const currentUrl = await this.getCurrentUrl();
      
      if (currentUrl.includes('cvf') || currentUrl.includes('captcha')) {
        this.broadcast('login-challenge', { type: 'captcha' });
        throw new Error('CAPTCHA detected - manual intervention required');
      }
      
      if (currentUrl.includes('mfa') || currentUrl.includes('otpCode')) {
        this.broadcast('login-challenge', { type: '2fa' });
        throw new Error('2FA detected - manual intervention required');
      }
      
      // Verify successful login
      const loginSuccess = await this.verifyLoginStatus();
      if (!loginSuccess) {
        throw new Error('Login verification failed');
      }
      
      // Save session cookies
      const cookies = await this.client.getCookies(this.sessionId);
      await this.sessionManager.saveSession(sessionKey, cookies, { email, loginTime: Date.now() });
      
      this.isLoggedIn = true;
      this.broadcast('login-success', { method: 'fresh-login' });
      return true;
      
    } catch (error) {
      this.broadcast('login-error', { error: error.message });
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Verify if user is logged in
   */
  async verifyLoginStatus() {
    try {
      const accountElements = await this.client.extract(this.sessionId, {
        accountNav: '#nav-link-accountList',
        signInText: '#nav-link-accountList .nav-line-1'
      });
      
      return accountElements.signInText && !accountElements.signInText.includes('Sign in');
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current page URL
   */
  async getCurrentUrl() {
    try {
      const result = await this.client.extract(this.sessionId, { url: 'window.location.href' });
      return result.url || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Search and apply filters
   */
  async searchAndFilter(query, filters = {}) {
    try {
      this.broadcast('search-start', { query, filters });
      
      // Navigate to Amazon homepage
      await this.client.navigate(this.sessionId, 'https://www.amazon.com');
      
      // Perform search
      await this.client.waitForElement(this.sessionId, this.selectors.search.searchBox[0]);
      await this.client.type(this.sessionId, this.selectors.search.searchBox, query);
      await this.client.click(this.sessionId, this.selectors.search.searchButton);
      
      this.broadcast('search-results', { query });
      
      // Apply filters if specified
      if (Object.keys(filters).length > 0) {
        await this.applyFilters(filters);
      }
      
      return true;
    } catch (error) {
      this.broadcast('search-error', { error: error.message });
      logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Apply search filters
   */
  async applyFilters(filters) {
    try {
      this.broadcast('filters-start', { filters });
      
      // Open all filters modal
      await this.client.click(this.selectors.search.allFiltersButton);
      await this.client.delay(2000);
      
      // Apply price filter
      if (filters.priceMin || filters.priceMax) {
        await this.applyPriceFilter(filters.priceMin, filters.priceMax);
      }
      
      // Apply rating filter
      if (filters.minRating) {
        await this.applyRatingFilter(filters.minRating);
      }
      
      // Apply Prime filter
      if (filters.primeOnly) {
        await this.applyPrimeFilter();
      }
      
      // Apply filters
      await this.client.click(this.selectors.search.applyButton);
      await this.client.delay(3000); // Wait for AJAX reload
      
      this.broadcast('filters-applied', { filters });
    } catch (error) {
      this.broadcast('filters-error', { error: error.message });
      logger.error('Filter application failed:', error);
    }
  }

  /**
   * Apply price range filter
   */
  async applyPriceFilter(minPrice, maxPrice) {
    try {
      await this.client.click(this.selectors.search.priceFilter);
      
      if (minPrice) {
        await this.client.type(this.sessionId, 'input[name="low-price"]', minPrice.toString());
      }
      
      if (maxPrice) {
        await this.client.type(this.sessionId, 'input[name="high-price"]', maxPrice.toString());
      }
      
      await this.client.click('[data-action="apply-price-filter"]');
    } catch (error) {
      logger.warn('Price filter application failed:', error.message);
    }
  }

  /**
   * Apply rating filter
   */
  async applyRatingFilter(minRating) {
    try {
      const ratingSelector = `[aria-label*="${minRating} Stars"]`;
      await this.client.click(ratingSelector);
    } catch (error) {
      logger.warn('Rating filter application failed:', error.message);
    }
  }

  /**
   * Apply Prime filter
   */
  async applyPrimeFilter() {
    try {
      await this.client.click(this.selectors.search.primeFilter);
    } catch (error) {
      logger.warn('Prime filter application failed:', error.message);
    }
  }

  /**
   * Extract paginated search results
   */
  async extractPaginatedResults(maxPages = 5) {
    const allResults = [];
    let currentPage = 1;
    
    try {
      this.broadcast('extraction-start', { maxPages });
      
      while (currentPage <= maxPages) {
        this.broadcast('extraction-page', { page: currentPage });
        
        // Extract current page results
        const pageResults = await this.extractCurrentPageResults();
        allResults.push(...pageResults);
        
        this.broadcast('extraction-page-complete', { 
          page: currentPage, 
          count: pageResults.length,
          total: allResults.length 
        });
        
        // Check for next page
        const hasNext = await this.hasNextPage();
        if (!hasNext || currentPage >= maxPages) {
          break;
        }
        
        // Navigate to next page
        await this.client.click(this.selectors.search.nextButton);
        await this.client.delay(2000); // Rate limiting
        currentPage++;
      }
      
      this.broadcast('extraction-complete', { 
        totalResults: allResults.length,
        pages: currentPage 
      });
      
      return allResults;
    } catch (error) {
      this.broadcast('extraction-error', { error: error.message });
      logger.error('Result extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract results from current page
   */
  async extractCurrentPageResults() {
    try {
      const products = await this.client.extract(this.sessionId, {
        containers: this.selectors.results.productContainer[0]
      }, { multiple: true });
      
      const results = [];
      
      for (const container of products.containers || []) {
        try {
          const productData = await this.extractProductFromContainer(container);
          if (productData) {
            results.push(productData);
          }
        } catch (error) {
          logger.warn('Failed to extract product:', error.message);
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Page extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract product data from container element
   */
  async extractProductFromContainer(container) {
    try {
      const data = await this.client.extract(this.sessionId, {
        title: this.selectors.results.title[0],
        price: this.selectors.results.price[0],
        rating: this.selectors.results.rating[0],
        reviewCount: this.selectors.results.reviewCount[0],
        image: this.selectors.results.image[0],
        link: this.selectors.results.link[0],
        prime: this.selectors.results.prime[0],
        sponsored: this.selectors.results.sponsored[0]
      });
      
      return {
        title: this.cleanText(data.title),
        price: this.parsePrice(data.price),
        rating: this.parseRating(data.rating),
        reviewCount: this.parseReviewCount(data.reviewCount),
        imageUrl: data.image?.src || data.image,
        productUrl: this.buildFullUrl(data.link?.href || data.link),
        isPrime: !!data.prime,
        isSponsored: !!data.sponsored,
        extractedAt: Date.now()
      };
    } catch (error) {
      logger.warn('Product extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Get detailed product information
   */
  async getProductDetails(productUrl) {
    try {
      this.broadcast('product-details-start', { url: productUrl });
      
      await this.client.navigate(this.sessionId, productUrl);
      
      // Handle region popup if present
      try {
        await this.client.click('.a-popover-close', { timeout: 2000 });
      } catch (error) {
        // Popup not present, continue
      }
      
      const details = await this.client.extract(this.sessionId, {
        title: this.selectors.product.title[0],
        currentPrice: this.selectors.product.price[0],
        originalPrice: this.selectors.product.originalPrice[0],
        rating: this.selectors.product.rating[0],
        reviewCount: this.selectors.product.reviewCount[0],
        availability: this.selectors.product.availability[0],
        seller: this.selectors.product.seller[0],
        shipping: this.selectors.product.shipping[0],
        features: '.feature .a-list-item'
      }, { multiple: true });
      
      const productDetails = {
        title: this.cleanText(details.title),
        currentPrice: this.parsePrice(details.currentPrice),
        originalPrice: this.parsePrice(details.originalPrice),
        rating: this.parseRating(details.rating),
        reviewCount: this.parseReviewCount(details.reviewCount),
        availability: this.cleanText(details.availability),
        seller: this.cleanText(details.seller),
        shipping: this.cleanText(details.shipping),
        features: (details.features || []).map(f => this.cleanText(f)).filter(Boolean),
        url: productUrl,
        extractedAt: Date.now()
      };
      
      this.broadcast('product-details-complete', productDetails);
      return productDetails;
    } catch (error) {
      this.broadcast('product-details-error', { error: error.message });
      logger.error('Product details extraction failed:', error);
      throw error;
    }
  }

  /**
   * Check if next page exists
   */
  async hasNextPage() {
    try {
      const nextButton = await this.client.extract(this.sessionId, {
        next: this.selectors.search.nextButton[0]
      });
      
      return !!nextButton.next && !nextButton.next.includes('disabled');
    } catch (error) {
      return false;
    }
  }

  /**
   * Utility functions for data cleaning
   */
  cleanText(text) {
    if (!text) return '';
    return text.toString().trim().replace(/\s+/g, ' ');
  }

  parsePrice(priceText) {
    if (!priceText) return null;
    const match = priceText.toString().match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : null;
  }

  parseRating(ratingText) {
    if (!ratingText) return null;
    const match = ratingText.toString().match(/(\d+\.?\d*)\s*out\s*of\s*5/i);
    return match ? parseFloat(match[1]) : null;
  }

  parseReviewCount(reviewText) {
    if (!reviewText) return null;
    const match = reviewText.toString().match(/([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, '')) : null;
  }

  buildFullUrl(relativeUrl) {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    return `https://www.amazon.com${relativeUrl}`;
  }

  /**
   * Close session and cleanup
   */
  async close() {
    if (this.sessionId) {
      await this.client.closeSession(this.sessionId);
      this.sessionId = null;
      this.isLoggedIn = false;
      this.broadcast('session-closed');
    }
  }
}

module.exports = AmazonAgent;