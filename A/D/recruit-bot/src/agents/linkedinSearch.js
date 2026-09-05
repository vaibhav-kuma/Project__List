const { sleep, withRetry } = require('../utils/helpers');
const logger = require('../utils/logger');

const SEARCH_URL = 'https://www.linkedin.com/search/results/people/';
const RATE_LIMIT_WAIT = parseInt(process.env.RATE_LIMIT_WAIT_MS, 10) || 60000;
const MAX_PAGES = parseInt(process.env.MAX_PAGES_PER_SEARCH, 10) || 5;

// All selectors carry 2+ fallbacks
const SEL = {
  allFiltersBtn: [
    'button[aria-label="All filters"]',
    'button[data-control-name="all_filters"]',
    '.search-reusables__all-filters-pill-button',
  ],
  filterModal: [
    '.search-reusables__advanced-filters-binary-toggle',
    '[data-test-modal]',
    '.artdeco-modal',
  ],
  titleInput: [
    'input[aria-label*="Title"]',
    'input[placeholder*="title"]',
    '#advanced-filter-title',
  ],
  locationInput: [
    'input[aria-label*="Location"]',
    'input[placeholder*="location"]',
    '#advanced-filter-location',
  ],
  keywordInput: [
    'input[aria-label*="Keywords"]',
    '.search-basic-typeahead input',
    'input[placeholder*="keyword"]',
  ],
  typeaheadOption: [
    '.basic-typeahead__selectable',
    '[role="option"]',
    '.search-typeahead-v2__hit',
  ],
  showResultsBtn: [
    'button[aria-label*="Show"]',
    'button[data-control-name="advanced_filter_apply"]',
    '.artdeco-modal__actionbar button[type="submit"]',
  ],
  resultsList: [
    '.reusable-search__result-container',
    '.search-results-container ul',
    '[data-chameleon-result-urn]',
  ],
  candidateCard: [
    'li.reusable-search__result-container',
    '.entity-result',
    '[data-view-name="search-entity-result-universal-template"]',
  ],
  candidateName: [
    '.entity-result__title-text a span[aria-hidden="true"]',
    '.actor-name',
    '.entity-result__title-line span[aria-hidden]',
  ],
  candidateHeadline: [
    '.entity-result__primary-subtitle',
    '.subline-level-1',
    '.entity-result__summary',
  ],
  candidateLocation: [
    '.entity-result__secondary-subtitle',
    '.subline-level-2',
    '.entity-result__badge-text',
  ],
  candidateProfileLink: [
    '.entity-result__title-text a',
    'a.app-aware-link[href*="/in/"]',
  ],
  candidateImage: [
    '.presence-entity__image',
    '.entity-result__universal-image img',
    'img.evi-image',
  ],
  nextBtn: [
    'button[aria-label="Next"]',
    '.artdeco-pagination__button--next',
    'button[data-control-name="next"]',
  ],
  // Profile page selectors
  aboutSection: [
    '.pv-shared-text-with-see-more .visually-hidden',
    '#about ~ .pvs-list__outer-container span[aria-hidden="true"]',
    '.pv-about-section p',
  ],
  experienceSection: [
    '#experience ~ .pvs-list__outer-container li',
    '.pv-profile-section__list-item',
    '[data-field="experience_company_logo"] ~ div',
  ],
  educationSection: [
    '#education ~ .pvs-list__outer-container li',
    '.pv-education-entity',
  ],
  skillsSection: [
    '#skills ~ .pvs-list__outer-container li .visually-hidden',
    '.pv-skill-category-entity__name span',
    '[data-field="skill_card_skill_topic"] span[aria-hidden]',
  ],
};

class LinkedInSearch {
  constructor(client) {
    this.client = client;
  }

  async applyFilters(sessionId, { title, location, keywords = [] }) {
    logger.info('Applying LinkedIn search filters', { title, location });

    await withRetry(
      async () => {
        await this.client.navigate(sessionId, SEARCH_URL, { waitUntil: 'networkidle' });
        await sleep(1500);

        // Open All Filters modal
        await this.client.execute(sessionId, [
          { type: 'waitForSelector', selectors: SEL.allFiltersBtn, timeout: 10000 },
          { type: 'click', selectors: SEL.allFiltersBtn },
          { type: 'waitForSelector', selectors: SEL.filterModal, timeout: 8000 },
        ]);

        // Fill title with typeahead
        if (title) {
          await this._fillTypeahead(sessionId, SEL.titleInput, title);
        }

        // Fill location with typeahead
        if (location) {
          await this._fillTypeahead(sessionId, SEL.locationInput, location);
        }

        // Fill keyword (no typeahead)
        if (keywords.length > 0) {
          await this.client.execute(sessionId, [
            { type: 'waitForSelector', selectors: SEL.keywordInput, timeout: 5000 },
            { type: 'type', selectors: SEL.keywordInput, text: keywords.join(' '), clearFirst: true },
          ]);
        }

        // Submit filters
        await this.client.execute(sessionId, [
          { type: 'click', selectors: SEL.showResultsBtn },
          { type: 'waitForNavigation', timeout: 15000 },
        ]);

        await sleep(2000);
        logger.info('Filters applied, results page loaded');
      },
      { retries: 3, baseDelay: 3000, label: 'apply-filters' }
    );
  }

  async _fillTypeahead(sessionId, inputSelectors, value) {
    await this.client.execute(sessionId, [
      { type: 'waitForSelector', selectors: inputSelectors, timeout: 5000 },
      { type: 'click', selectors: inputSelectors },
      { type: 'type', selectors: inputSelectors, text: value, clearFirst: true },
      { type: 'wait', ms: 1200 }, // wait for typeahead to populate
    ]);

    // Try to click the first matching typeahead option
    const typeaheadVisible = await this.client.extract(sessionId, {
      hasOption: { selector: SEL.typeaheadOption.join(', '), type: 'exists' },
    });

    if (typeaheadVisible.hasOption) {
      await this.client.execute(sessionId, [
        { type: 'click', selectors: SEL.typeaheadOption },
        { type: 'wait', ms: 500 },
      ]);
    }
    // If no typeahead appeared, the typed value is used as-is (acceptable fallback)
  }

  async extractPage(sessionId) {
    const result = await this.client.extract(sessionId, {
      candidates: {
        selector: SEL.candidateCard.join(', '),
        type: 'list',
        fields: {
          name: { selector: SEL.candidateName.join(', '), type: 'text' },
          headline: { selector: SEL.candidateHeadline.join(', '), type: 'text' },
          location: { selector: SEL.candidateLocation.join(', '), type: 'text' },
          profileUrl: { selector: SEL.candidateProfileLink.join(', '), type: 'attribute', attribute: 'href' },
          imageUrl: { selector: SEL.candidateImage.join(', '), type: 'attribute', attribute: 'src' },
        },
      },
    });

    return (result.candidates || [])
      .filter((c) => c.name && c.profileUrl)
      .map((c) => ({
        ...c,
        profileUrl: c.profileUrl?.startsWith('http')
          ? c.profileUrl
          : `https://www.linkedin.com${c.profileUrl}`,
        source: 'linkedin',
      }));
  }

  async hasNextPage(sessionId) {
    const result = await this.client.extract(sessionId, {
      nextBtn: { selector: SEL.nextBtn.join(', '), type: 'exists' },
      nextDisabled: { selector: SEL.nextBtn.join(', '), type: 'attribute', attribute: 'disabled' },
    });
    return result.nextBtn && !result.nextDisabled;
  }

  async goToNextPage(sessionId) {
    await this.client.execute(sessionId, [
      { type: 'click', selectors: SEL.nextBtn },
      { type: 'waitForNavigation', timeout: 15000 },
    ]);
    await sleep(2000); // rate-limit courtesy delay
  }

  async scrapePages(sessionId, maxPages = MAX_PAGES) {
    const allCandidates = [];

    for (let page = 1; page <= maxPages; page++) {
      logger.info(`Extracting page ${page}/${maxPages}`);

      const candidates = await withRetry(
        () => this.extractPage(sessionId),
        { retries: 3, baseDelay: 2000, label: `extract-page-${page}` }
      );

      logger.info(`Page ${page}: found ${candidates.length} candidates`);
      allCandidates.push(...candidates);

      if (page < maxPages) {
        const more = await this.hasNextPage(sessionId);
        if (!more) {
          logger.info('No more pages available');
          break;
        }
        await this.goToNextPage(sessionId);
      }
    }

    return allCandidates;
  }

  async enrichProfile(sessionId, candidate) {
    return withRetry(
      async () => {
        logger.debug('Enriching profile', { name: candidate.name, url: candidate.profileUrl });
        await this.client.navigate(sessionId, candidate.profileUrl, { timeout: 20000 });
        await sleep(1500);

        // Scroll to load lazy sections
        await this.client.execute(sessionId, [
          { type: 'scroll', direction: 'down', amount: 800 },
          { type: 'wait', ms: 800 },
          { type: 'scroll', direction: 'down', amount: 800 },
          { type: 'wait', ms: 800 },
        ]);

        const profile = await this.client.extract(sessionId, {
          about: { selector: SEL.aboutSection.join(', '), type: 'text' },
          experience: {
            selector: SEL.experienceSection.join(', '),
            type: 'list',
            fields: {
              title: { selector: 'span[aria-hidden="true"]', type: 'text', index: 0 },
              company: { selector: 'span[aria-hidden="true"]', type: 'text', index: 1 },
              duration: { selector: '.pvs-entity__caption-wrapper', type: 'text' },
            },
          },
          education: {
            selector: SEL.educationSection.join(', '),
            type: 'list',
            fields: {
              school: { selector: 'span[aria-hidden="true"]', type: 'text', index: 0 },
              degree: { selector: 'span[aria-hidden="true"]', type: 'text', index: 1 },
            },
          },
          skills: { selector: SEL.skillsSection.join(', '), type: 'list', fields: { name: { type: 'text' } } },
        });

        return {
          ...candidate,
          about: profile.about || '',
          experience: profile.experience || [],
          education: profile.education || [],
          skills: (profile.skills || []).map((s) => s.name).filter(Boolean).slice(0, 20),
          enrichedAt: new Date().toISOString(),
        };
      },
      { retries: 3, baseDelay: 3000, label: `enrich-${candidate.name}` }
    );
  }
}

module.exports = LinkedInSearch;
