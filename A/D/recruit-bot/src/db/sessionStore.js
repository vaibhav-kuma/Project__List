const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const STORE_PATH = path.resolve(process.cwd(), '.sessions');

function cookiePath(account) {
  return path.join(STORE_PATH, `${account}.json`);
}

function saveCookies(account, cookies) {
  if (!fs.existsSync(STORE_PATH)) fs.mkdirSync(STORE_PATH, { recursive: true });
  fs.writeFileSync(cookiePath(account), JSON.stringify(cookies, null, 2));
  logger.debug('Cookies saved', { account });
}

function loadCookies(account) {
  const p = cookiePath(account);
  if (!fs.existsSync(p)) return null;
  try {
    const cookies = JSON.parse(fs.readFileSync(p, 'utf8'));
    logger.debug('Cookies loaded', { account, count: cookies.length });
    return cookies;
  } catch {
    return null;
  }
}

function clearCookies(account) {
  const p = cookiePath(account);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  logger.debug('Cookies cleared', { account });
}

module.exports = { saveCookies, loadCookies, clearCookies };
