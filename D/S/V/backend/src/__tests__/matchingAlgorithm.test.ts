describe('Matching Algorithm', () => {
  type User = {
    id: string;
    age: number;
    gender: string;
    preferredGenders: string[];
    ageRangeMin: number;
    ageRangeMax: number;
    languages: string[];
    countries: string[];
    interestTags: string[];
    isPremium: boolean;
  };

  function calculateCompatibility(a: User, b: User): number {
    let score = 0;

    if (b.preferredGenders.includes(a.gender) && a.preferredGenders.includes(b.gender)) {
      score += 30;
    } else if (b.preferredGenders.includes(a.gender) || a.preferredGenders.includes(b.gender)) {
      score += 15;
    }

    if (a.age >= b.ageRangeMin && a.age <= b.ageRangeMax &&
        b.age >= a.ageRangeMin && b.age <= a.ageRangeMax) {
      score += 25;
    } else {
      const aOverlap = Math.max(0, Math.min(a.age, b.ageRangeMax) - Math.max(a.age, b.ageRangeMin));
      const bOverlap = Math.max(0, Math.min(b.age, a.ageRangeMax) - Math.max(b.age, a.ageRangeMin));
      if (aOverlap > 0 || bOverlap > 0) score += 10;
    }

    const commonLangs = a.languages.filter((l) => b.languages.includes(l));
    score += Math.min(commonLangs.length * 10, 20);

    const commonCountries = a.countries.filter((c) => b.countries.includes(c));
    if (commonCountries.length > 0) score += 10;

    const commonInterests = a.interestTags.filter((t) => b.interestTags.includes(t));
    score += Math.min(commonInterests.length * 5, 15);

    if (a.isPremium) score += 5;
    if (b.isPremium) score += 5;

    return Math.min(score, 100);
  }

  const userA: User = {
    id: 'a', age: 25, gender: 'male',
    preferredGenders: ['female'], ageRangeMin: 18, ageRangeMax: 35,
    languages: ['en'], countries: ['US'], interestTags: ['music', 'travel'],
    isPremium: false,
  };

  const userB: User = {
    id: 'b', age: 24, gender: 'female',
    preferredGenders: ['male'], ageRangeMin: 20, ageRangeMax: 40,
    languages: ['en', 'es'], countries: ['US'], interestTags: ['music', 'art'],
    isPremium: true,
  };

  const userC: User = {
    id: 'c', age: 45, gender: 'male',
    preferredGenders: ['female'], ageRangeMin: 30, ageRangeMax: 50,
    languages: ['fr'], countries: ['FR'], interestTags: ['cooking'],
    isPremium: false,
  };

  const userD: User = {
    id: 'd', age: 17, gender: 'female',
    preferredGenders: ['male'], ageRangeMin: 18, ageRangeMax: 25,
    languages: ['en'], countries: ['GB'], interestTags: [],
    isPremium: false,
  };

  describe('gender compatibility', () => {
    it('should give max score for mutual preference', () => {
      const score = calculateCompatibility(userA, userB);
      expect(score).toBeGreaterThanOrEqual(30);
    });

    it('should give half score for one-sided preference', () => {
      const oneWayA = { ...userA, preferredGenders: ['female'] };
      const oneWayB = { ...userB, preferredGenders: ['other'] };
      const mutualScore = calculateCompatibility(userA, userB);
      const oneWayScore = calculateCompatibility(oneWayA, oneWayB);
      expect(oneWayScore).toBeLessThan(mutualScore);
    });
  });

  describe('age compatibility', () => {
    it('should give full score when both in range', () => {
      const score = calculateCompatibility(userA, userB);
      expect(score).toBeGreaterThanOrEqual(25);
    });

    it('should give partial score for partial overlap', () => {
      const score = calculateCompatibility(userA, userC);
      expect(score).toBeLessThan(25);
    });

    it('should handle edge ages near boundaries', () => {
      const edgeA = { ...userA, age: 18 };
      const edgeB = { ...userB, ageRangeMin: 18, ageRangeMax: 18 };
      const score = calculateCompatibility(edgeA, edgeB);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('language compatibility', () => {
    it('should score higher for shared languages', () => {
      const mono = { ...userB, languages: ['en'] };
      const scoreShared = calculateCompatibility(userA, mono);
      const scoreNoShared = calculateCompatibility(userA, { ...userC, languages: ['de'] });
      expect(scoreShared).toBeGreaterThan(scoreNoShared);
    });

    it('should cap language score at 20', () => {
      const multiLang = { ...userA, languages: ['en', 'es', 'fr', 'de', 'zh'] };
      const score = calculateCompatibility(multiLang, userB);
      const baseScore = calculateCompatibility(userA, userB);
      const langScore = score - baseScore;
      expect(langScore).toBeLessThanOrEqual(20);
    });
  });

  describe('interest compatibility', () => {
    it('should score for shared interests', () => {
      const shared = { ...userC, interestTags: ['music', 'travel', 'hiking'] };
      const score = calculateCompatibility(userA, shared);
      expect(score).toBeGreaterThan(calculateCompatibility(userA, userC));
    });
  });

  describe('premium boost', () => {
    it('should give extra score when user is premium', () => {
      const scorePremium = calculateCompatibility(userA, userB);
      const scoreRegular = calculateCompatibility(userA, { ...userB, isPremium: false });
      expect(scorePremium).toBeGreaterThan(scoreRegular);
    });
  });

  describe('maximum score', () => {
    it('should never exceed 100', () => {
      const perfectMatch = { ...userA };
      const score = calculateCompatibility(perfectMatch, perfectMatch);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('age filtering', () => {
    it('should not match if age outside both ranges', () => {
      const score = calculateCompatibility(userA, { ...userB, age: 50, ageRangeMin: 40, ageRangeMax: 60 });
      const ageScore = score - calculateCompatibility(userA, userB) + 25;
      expect(ageScore).toBeLessThan(25);
    });
  });

  describe('performance', () => {
    it('should compute quickly for bulk operations', () => {
      const users: User[] = Array.from({ length: 100 }, (_, i) => ({
        id: `user-${i}`, age: 18 + (i % 50), gender: i % 2 === 0 ? 'male' : 'female',
        preferredGenders: i % 2 === 0 ? ['female'] : ['male'],
        ageRangeMin: 18, ageRangeMax: 60,
        languages: ['en'], countries: [],
        interestTags: i % 3 === 0 ? ['music'] : i % 3 === 1 ? ['sports'] : ['travel'],
        isPremium: i % 5 === 0,
      }));

      const start = Date.now();
      for (const u of users) {
        calculateCompatibility(users[0], u);
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });
});
