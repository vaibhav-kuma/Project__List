const { sleep, withRetry } = require('../utils/helpers');
const { saveCookies, loadCookies, clearCookies } = require('../db/sessionStore');
const logger = require('../utils/logger');

const LINKEDIN_LOGIN_URL = 'https://www.linkedin.com/login';
const LINKEDIN_FEED_URL = 'https://www.linkedin.com/feed/';
const ACCOUNT_KEY = 'linkedin_default';

// Selectors with fallbacks — LinkedIn changes these periodically
const SEL = {
  emailInput: ['#username', 'input[name="session_key"]', 'input[autocomplete="username"]'],
  passwordInput: ['#password', 'input[name="session_password"]', 'input[type="password"]'],
  submitBtn: ['button[type="submit"]', '.login__form_action_container button', 'button[data-litms-control-urn]'],
  captchaFrame: ['iframe[src*="captcha"]', '#captcha-internal', '.captcha__image'],
  twoFaInput: ['input[name="pin"]', '#input__phone_verification_pin', 'input[autocomplete="one-time-code"]'],
  twoFaSubmit: ['button[type="submit"]', '#two-step-submit-button'],
  errorMsg: ['.alert-content', '#error-for-username', '.form__label--error'],
  navBar: ['#global-nav', '.global-nav', 'nav[aria-label="primary"]'],
};

function firstSelector(list) {
  return list[0]; // TinyFish execute will try each; we pass all as fallbacks
}

class LinkedInAuth {
  constructor(client) {
    this.client = client;
  }

  // Returns true if the current page looks like a logged-in LinkedIn session
  async isLoggedIn(sessionId) {
    try {
      const result = await this.client.extract(sessionId, {
        navBar: { selector: SEL.navBar.join(', '), type: 'exists' },
      });
      return !!result.navBar;
    } catch {
      return false;
    }
  }

  // Restore a previous session from saved cookies. Returns true if still valid.
  async restoreSession(sessionId) {
    const cookies = loadCookies(ACCOUNT_KEY);
    if (!cookies) return false;

    await this.client.setCookies(sessionId, cookies);
    await this.client.navigate(sessionId, LINKEDIN_FEED_URL);
    const valid = await this.isLoggedIn(sessionId);

    if (!valid) {
      logger.info('Saved cookies expired, will re-login');
      clearCookies(ACCOUNT_KEY);
    }
    return valid;
  }

  async login(sessionId) {
    const email = process.env.LINKEDIN_EMAIL;
    const password = process.env.LINKEDIN_PASSWORD;
    if (!email || !password) throw new Error('LINKEDIN_EMAIL and LINKEDIN_PASSWORD are required');

    return withRetry(
      async () => {
        logger.info('Navigating to LinkedIn login');
        await this.client.navigate(sessionId, LINKEDIN_LOGIN_URL);

        // Fill credentials
        await this.client.execute(sessionId, [
          { type: 'waitForSelector', selectors: SEL.emailInput, timeout: 10000 },
          { type: 'type', selectors: SEL.emailInput, text: email, clearFirst: true },
          { type: 'type', selectors: SEL.passwordInput, text: password, clearFirst: true },
          { type: 'click', selectors: SEL.submitBtn },
          { type: 'waitForNavigation', timeout: 15000 },
        ]);

        await sleep(2000); // let post-login JS settle

        // Check for CAPTCHA
        const pageState = await this.client.extract(sessionId, {
          hasCaptcha: { selector: SEL.captchaFrame.join(', '), type: 'exists' },
          has2FA: { selector: SEL.twoFaInput.join(', '), type: 'exists' },
          hasError: { selector: SEL.errorMsg.join(', '), type: 'text' },
          currentUrl: { type: 'url' },
        });

        if (pageState.hasCaptcha) {
          logger.warn('CAPTCHA detected — waiting 30s for manual solve or external solver');
          await sleep(30000);
          // Re-check after wait
          const recheck = await this.isLoggedIn(sessionId);
          if (!recheck) throw new Error('CAPTCHA not resolved');
        }

        if (pageState.has2FA) {
          await this._handle2FA(sessionId);
        }

        if (pageState.hasError) {
          throw new Error(`LinkedIn login error: ${pageState.hasError}`);
        }

        const loggedIn = await this.isLoggedIn(sessionId);
        if (!loggedIn) throw new Error('Login failed — nav bar not found after submit');

        // Persist cookies for future runs
        const cookies = await this.client.getCookies(sessionId);
        saveCookies(ACCOUNT_KEY, cookies);
        logger.info('LinkedIn login successful, cookies persisted');
      },
      { retries: 3, baseDelay: 5000, label: 'linkedin-login' }
    );
  }

  async _handle2FA(sessionId) {
    logger.warn('2FA prompt detected — waiting up to 60s for pin entry');
    // In a real deployment this would push a notification or use an authenticator API.
    // For the demo we wait and let the operator enter the pin manually.
    await sleep(60000);
    const submitted = await this.client.extract(sessionId, {
      pinField: { selector: SEL.twoFaInput.join(', '), type: 'exists' },
    });
    if (submitted.pinField) {
      // Still on 2FA page — try clicking submit in case pin was entered
      await this.client.execute(sessionId, [
        { type: 'click', selectors: SEL.twoFaSubmit },
        { type: 'waitForNavigation', timeout: 10000 },
      ]);
    }
  }

  // Ensure the session is authenticated; login if not
  async ensureAuthenticated(sessionId) {
    const restored = await this.restoreSession(sessionId);
    if (!restored) await this.login(sessionId);
  }
}

module.exports = LinkedInAuth;
