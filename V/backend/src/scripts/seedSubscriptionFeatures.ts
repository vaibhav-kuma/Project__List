import prisma from '../config/database';
import logger from '../config/logger';

async function seedSubscriptionFeatures() {
  try {
    await prisma.subscriptionFeature.upsert({
      where: { plan: 'free' },
      update: {},
      create: {
        plan: 'free',
        unlimitedExtends: false,
        genderFilter: false,
        locationFilter: false,
        advancedFilters: false,
        priorityMatching: false,
        rewindFeature: false,
        unlimitedRewinds: false,
        seeWhoLikedYou: false,
        seeWhoAddedAsFriend: false,
        adFree: false,
        videoFilters: false,
        exclusiveFilters: false,
        exclusiveStickers: false,
        hdVideo: false,
        readReceipts: false,
        profileBoostsPerMonth: 0,
        maxDailyMatches: 10,
        incognitoMode: false,
        passportFeature: false,
      },
    });

    await prisma.subscriptionFeature.upsert({
      where: { plan: 'plus' },
      update: {},
      create: {
        plan: 'plus',
        unlimitedExtends: true,
        genderFilter: true,
        locationFilter: true,
        advancedFilters: true,
        priorityMatching: true,
        rewindFeature: true,
        unlimitedRewinds: true,
        seeWhoLikedYou: true,
        seeWhoAddedAsFriend: true,
        adFree: true,
        videoFilters: true,
        exclusiveFilters: true,
        exclusiveStickers: true,
        hdVideo: true,
        readReceipts: true,
        profileBoostsPerMonth: 2,
        maxDailyMatches: 100,
        incognitoMode: false,
        passportFeature: false,
      },
    });

    await prisma.subscriptionFeature.upsert({
      where: { plan: 'pro' },
      update: {},
      create: {
        plan: 'pro',
        unlimitedExtends: true,
        genderFilter: true,
        locationFilter: true,
        advancedFilters: true,
        priorityMatching: true,
        rewindFeature: true,
        unlimitedRewinds: true,
        seeWhoLikedYou: true,
        seeWhoAddedAsFriend: true,
        adFree: true,
        videoFilters: true,
        exclusiveFilters: true,
        exclusiveStickers: true,
        hdVideo: true,
        readReceipts: true,
        profileBoostsPerMonth: 5,
        maxDailyMatches: 1000,
        incognitoMode: true,
        passportFeature: true,
      },
    });

    await prisma.subscriptionFeature.upsert({
      where: { plan: 'premium' },
      update: {},
      create: {
        plan: 'premium',
        unlimitedExtends: true,
        genderFilter: true,
        locationFilter: true,
        advancedFilters: true,
        priorityMatching: true,
        rewindFeature: true,
        unlimitedRewinds: true,
        seeWhoLikedYou: true,
        seeWhoAddedAsFriend: true,
        adFree: true,
        videoFilters: true,
        exclusiveFilters: true,
        exclusiveStickers: true,
        hdVideo: true,
        readReceipts: true,
        profileBoostsPerMonth: 10,
        maxDailyMatches: 10000,
        incognitoMode: true,
        passportFeature: true,
      },
    });

    logger.info('Subscription features seeded successfully');
  } catch (error) {
    logger.error('Error seeding subscription features:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSubscriptionFeatures();
