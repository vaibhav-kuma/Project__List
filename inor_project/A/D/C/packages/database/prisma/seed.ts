import { prisma } from '../src/index';
import { hash } from 'bcryptjs';

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.analyticsEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.communityPost.deleteMany();
  await prisma.report.deleteMany();
  await prisma.videoImpression.deleteMany();
  await prisma.watchHistory.deleteMany();
  await prisma.playlistVideo.deleteMany();
  await prisma.playlist.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.videoProcessingJob.deleteMany();
  await prisma.video.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();

  const password = await hash('password123', 12);

  const users = await Promise.all([
    prisma.user.create({ data: { email: 'admin@ytclone.com', username: 'admin', password, role: 'ADMIN' } }),
    prisma.user.create({ data: { email: 'creator1@ytclone.com', username: 'techguru', password, role: 'CREATOR' } }),
    prisma.user.create({ data: { email: 'creator2@ytclone.com', username: 'musicvibes', password, role: 'CREATOR' } }),
    prisma.user.create({ data: { email: 'creator3@ytclone.com', username: 'gamingzone', password, role: 'CREATOR' } }),
    prisma.user.create({ data: { email: 'user1@ytclone.com', username: 'johndoe', password, role: 'USER' } }),
  ]);

  const channels = await Promise.all([
    prisma.channel.create({ data: { name: 'TechGuru', handle: '@techguru', description: 'Latest tech reviews and tutorials', userId: users[1].id, isVerified: true, subscriberCount: 250000 } }),
    prisma.channel.create({ data: { name: 'Music Vibes', handle: '@musicvibes', description: 'Best music mixes and covers', userId: users[2].id, isVerified: true, subscriberCount: 500000 } }),
    prisma.channel.create({ data: { name: 'GamingZone', handle: '@gamingzone', description: 'Gameplay walkthroughs and live streams', userId: users[3].id, isVerified: false, subscriberCount: 75000 } }),
  ]);

  const videoData = [
    { title: 'Building a Full-Stack App with Next.js 14', description: 'Learn how to build a modern full-stack application using Next.js 14, TypeScript, and Tailwind CSS. This comprehensive tutorial covers everything from setup to deployment.', channelIdx: 0, views: 45000, duration: 1847, tags: ['nextjs', 'react', 'typescript', 'tutorial'], category: 'education' },
    { title: 'Top 10 VS Code Extensions for 2024', description: 'Boost your productivity with these must-have VS Code extensions. From debugging to theming, we cover it all.', channelIdx: 0, views: 32000, duration: 624, tags: ['vscode', 'productivity', 'tools'], category: 'science' },
    { title: 'Understanding TypeScript Generics', description: 'A deep dive into TypeScript generics. Learn how to write reusable, type-safe code with practical examples.', channelIdx: 0, views: 28000, duration: 1560, tags: ['typescript', 'generics', 'advanced'], category: 'education' },
    { title: 'Chill Lo-Fi Mix - Study & Relax', description: '1 hour of chill lo-fi hip hop beats to help you study, relax, or code. Perfect background music for productivity.', channelIdx: 1, views: 89000, duration: 3600, tags: ['lofi', 'music', 'chill', 'study'], category: 'music' },
    { title: 'Indie Rock Playlist 2024', description: 'The best indie rock songs of 2024 curated just for you. Discover new artists and hidden gems.', channelIdx: 1, views: 67000, duration: 2400, tags: ['indie', 'rock', 'playlist', '2024'], category: 'music' },
    { title: 'How to Mix Vocals Like a Pro', description: 'Professional vocal mixing techniques used in the music industry. From EQ to compression, learn it all.', channelIdx: 1, views: 34000, duration: 1200, tags: ['music', 'mixing', 'vocals', 'tutorial'], category: 'music' },
    { title: 'Minecraft Survival Series - Episode 1', description: 'Starting a brand new Minecraft survival world! Join me on this epic adventure from day one.', channelIdx: 2, views: 15000, duration: 1800, tags: ['minecraft', 'gaming', 'survival', 'letsplay'], category: 'gaming' },
    { title: 'Valorant - Best Moments of the Week', description: 'Epic clutches, funny moments, and incredible plays from this week in Valorant.', channelIdx: 2, views: 22000, duration: 900, tags: ['valorant', 'gaming', 'highlights'], category: 'gaming' },
    { title: 'React vs Vue vs Angular 2024', description: 'An honest comparison of the three most popular frontend frameworks. Which one should you choose in 2024?', channelIdx: 0, views: 55000, duration: 1357, tags: ['react', 'vue', 'angular', 'comparison'], category: 'education' },
    { title: 'Jazz & Coffee - Relaxing Jazz Music', description: 'Smooth jazz music perfect for a relaxing afternoon with a cup of coffee.', channelIdx: 1, views: 43000, duration: 5400, tags: ['jazz', 'relax', 'coffee', 'music'], category: 'music' },
    { title: 'Elden Ring - Boss Guide Part 1', description: 'Complete guide to defeating the early game bosses in Elden Ring. Tips and strategies included.', channelIdx: 2, views: 18000, duration: 2400, tags: ['eldenring', 'gaming', 'guide', 'boss'], category: 'gaming' },
    { title: 'CSS Tips and Tricks You Need to Know', description: '10 CSS tips and tricks that will make your life easier. From grids to animations, master modern CSS.', channelIdx: 0, views: 38000, duration: 780, tags: ['css', 'webdev', 'tips'], category: 'education' },
    { title: 'Late Night Jazz - Smooth Jazz for Sleep', description: 'Gentle late night jazz music for relaxation, sleep, or meditation.', channelIdx: 1, views: 31000, duration: 7200, tags: ['jazz', 'sleep', 'relaxation', 'night'], category: 'music' },
    { title: 'Fortnite - Victory Royale Compilation', description: 'Best Victory Royale moments with incredible finishes.', channelIdx: 2, views: 12000, duration: 600, tags: ['fortnite', 'gaming', 'victory'], category: 'gaming' },
  ];

  const videos = await Promise.all(
    videoData.map((v) =>
      prisma.video.create({
        data: {
          title: v.title,
          description: v.description,
          thumbnailUrl: `https://picsum.photos/seed/${v.title.replace(/\s+/g, '')}/640/360`,
          videoUrl: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
          duration: v.duration,
          views: v.views,
          tags: v.tags,
          category: v.category,
          channelId: channels[v.channelIdx].id,
          status: 'PUBLISHED',
          publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        },
      })
    )
  );

  // Create comments
  for (const video of videos.slice(0, 5)) {
    await prisma.comment.create({
      data: { content: 'Great video! Very informative.', userId: users[4].id, videoId: video.id },
    });
    await prisma.comment.create({
      data: { content: 'Thanks for sharing this!', userId: users[0].id, videoId: video.id },
    });
  }

  // Create likes
  await prisma.like.create({ data: { userId: users[4].id, videoId: videos[0].id, type: 'LIKE' } });
  await prisma.like.create({ data: { userId: users[4].id, videoId: videos[3].id, type: 'LIKE' } });
  await prisma.like.create({ data: { userId: users[4].id, videoId: videos[1].id, type: 'LIKE' } });
  await prisma.like.create({ data: { userId: users[0].id, videoId: videos[0].id, type: 'LIKE' } });

  // Create subscriptions
  await prisma.subscription.create({ data: { subscriberId: users[4].id, channelId: channels[0].id } });
  await prisma.subscription.create({ data: { subscriberId: users[4].id, channelId: channels[1].id } });

  // Create playlists
  const playlist = await prisma.playlist.create({
    data: { title: 'Favorites', description: 'My favorite videos', visibility: 'PUBLIC', channelId: channels[0].id },
  });
  await prisma.playlistVideo.create({ data: { playlistId: playlist.id, videoId: videos[0].id, position: 0 } });
  await prisma.playlistVideo.create({ data: { playlistId: playlist.id, videoId: videos[8].id, position: 1 } });
  await prisma.playlistVideo.create({ data: { playlistId: playlist.id, videoId: videos[11].id, position: 2 } });

  // Create notifications
  await prisma.notification.create({
    data: { type: 'SUBSCRIBE', message: 'TechGuru uploaded a new video', userId: users[4].id },
  });

  // Create analytics events
  await prisma.analyticsEvent.create({
    data: { event: 'view', userId: users[4].id, metadata: { videoId: videos[0].id }, videoId: videos[0].id },
  });

  console.log('Database seeded successfully!');
  console.log(`Created ${users.length} users, ${channels.length} channels, ${videos.length} videos`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
