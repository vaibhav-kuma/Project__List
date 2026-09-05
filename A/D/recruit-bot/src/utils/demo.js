const logger = require('../utils/logger');

const DEMO_SEARCHES = [
  {
    id: 'demo-1',
    title: 'Senior Software Engineer',
    location: 'San Francisco Bay Area',
    skills: ['JavaScript', 'Node.js', 'React', 'TypeScript'],
    maxCandidates: 50,
    enrichTopN: 20,
    description: 'Full-stack engineer with modern web tech stack',
  },
  {
    id: 'demo-2',
    title: 'Product Manager',
    location: 'New York',
    skills: ['Product Strategy', 'Data Analysis', 'User Research'],
    maxCandidates: 30,
    enrichTopN: 15,
    description: 'Experienced product leader',
  },
  {
    id: 'demo-3',
    title: 'DevOps Engineer',
    location: 'Remote',
    skills: ['Kubernetes', 'AWS', 'Terraform', 'Docker'],
    maxCandidates: 40,
    enrichTopN: 15,
    description: 'Cloud infrastructure specialist',
  },
];

class DemoMode {
  static getSearches() {
    return DEMO_SEARCHES;
  }

  static getSearchById(id) {
    return DEMO_SEARCHES.find((s) => s.id === id);
  }

  static getDefaultSearch() {
    return DEMO_SEARCHES[0];
  }

  static generateMockResults(count = 50) {
    const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const companies = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix', 'Uber', 'Airbnb'];
    const titles = ['Senior Engineer', 'Staff Engineer', 'Principal Engineer', 'Engineering Manager'];
    const locations = ['San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'Remote'];
    const skills = [
      ['JavaScript', 'Node.js', 'React', 'TypeScript'],
      ['Python', 'Django', 'PostgreSQL', 'AWS'],
      ['Java', 'Spring Boot', 'Kubernetes', 'Docker'],
      ['Go', 'Rust', 'C++', 'System Design'],
      ['JavaScript', 'Vue.js', 'GraphQL', 'MongoDB'],
    ];

    const candidates = [];
    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const company = companies[Math.floor(Math.random() * companies.length)];
      const title = titles[Math.floor(Math.random() * titles.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const candidateSkills = skills[Math.floor(Math.random() * skills.length)];
      const score = Math.floor(Math.random() * 40) + 60; // 60-100

      candidates.push({
        id: `cand-${i}`,
        name: `${firstName} ${lastName}`,
        headline: `${title} at ${company}`,
        location,
        profileUrl: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${i}`,
        imageUrl: `https://i.pravatar.cc/150?img=${i}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        about: `Experienced ${title.toLowerCase()} with ${Math.floor(Math.random() * 15) + 3} years in tech.`,
        experience: [
          {
            title,
            company,
            duration: `${Math.floor(Math.random() * 5) + 1} yrs`,
          },
        ],
        education: [
          {
            school: 'University of California',
            degree: 'BS Computer Science',
          },
        ],
        skills: candidateSkills,
        sources: ['linkedin'],
        score,
        scoreBreakdown: {
          skillMatch: Math.floor(Math.random() * 20) + 20,
          experience: Math.floor(Math.random() * 15) + 15,
          location: Math.floor(Math.random() * 10) + 10,
          github: Math.floor(Math.random() * 10),
        },
        enrichedAt: new Date().toISOString(),
      });
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  static log() {
    logger.info('Demo mode available with pre-configured searches:', {
      searches: DEMO_SEARCHES.map((s) => ({ id: s.id, title: s.title, description: s.description })),
    });
  }
}

module.exports = DemoMode;
