import { MeiliSearch } from 'meilisearch';
import { prisma } from '@yt/database';
import { Prisma } from '@prisma/client';

const MEILISEARCH_URL = process.env.MEILISEARCH_URL || 'http://localhost:7700';
const MEILISEARCH_KEY = process.env.MEILISEARCH_API_KEY || '';

let meiliClient: MeiliSearch | null = null;
let meiliAvailable = false;

try {
  if (MEILISEARCH_KEY) {
    meiliClient = new MeiliSearch({ host: MEILISEARCH_URL, apiKey: MEILISEARCH_KEY });
    meiliClient.health().then(() => {
      meiliAvailable = true;
      console.log('Meilisearch connected');
    }).catch(() => {
      console.warn('Meilisearch unavailable, falling back to Prisma search');
    });
  }
} catch {
  console.warn('Meilisearch unavailable, falling back to Prisma search');
}

const SEARCHABLE_ATTRIBUTES = ['title', 'description', 'tags'];
const FILTERABLE_ATTRIBUTES = ['status', 'categoryId', 'channelId'];

export async function ensureSearchIndexes() {
  if (!meiliAvailable || !meiliClient) return;
  try {
    const index = meiliClient.index('videos');
    await index.updateSearchableAttributes(SEARCHABLE_ATTRIBUTES);
    await index.updateFilterableAttributes(FILTERABLE_ATTRIBUTES);
  } catch {}
}

export async function indexVideo(video: any) {
  if (!meiliAvailable || !meiliClient) return;
  try {
    await meiliClient.index('videos').addDocuments([{
      id: video.id,
      title: video.title,
      description: video.description,
      tags: video.tags,
      status: video.status,
      views: video.views,
      publishedAt: video.publishedAt?.toISOString(),
      createdAt: video.createdAt?.toISOString(),
    }]);
  } catch {}
}

export async function removeVideoIndex(videoId: string) {
  if (!meiliAvailable || !meiliClient) return;
  try {
    await meiliClient.index('videos').deleteDocument(videoId);
  } catch {}
}

export type SearchType = 'all' | 'video' | 'channel' | 'playlist';
export type SearchSort = 'relevance' | 'date' | 'views';

export interface SearchOptions {
  q: string;
  type: SearchType;
  sort: SearchSort;
  page: number;
  limit: number;
  userId?: string;
}

export interface SearchResult {
  videos: any[];
  channels: any[];
  playlists: any[];
  totalResults: number;
  searchTime: number;
}

async function searchMeili(q: string, page: number, limit: number): Promise<any[]> {
  if (!meiliAvailable || !meiliClient) return [];
  const result = await meiliClient.index('videos').search(q, {
    limit,
    offset: (page - 1) * limit,
    sort: ['views:desc'],
    attributesToHighlight: ['title', 'description'],
  });
  return result.hits || [];
}

async function searchPrisma(q: string, type: SearchType, sort: SearchSort, page: number, limit: number): Promise<SearchResult> {
  const startTime = Date.now();
  const results: SearchResult = { videos: [], channels: [], playlists: [], totalResults: 0, searchTime: 0 };

  const whereVideo: Prisma.VideoWhereInput = {
    status: 'PUBLISHED',
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { tags: { has: q } },
    ],
  };

  if (type === 'video' || type === 'all') {
    const orderBy: Prisma.VideoOrderByWithRelationInput[] = sort === 'date'
      ? [{ publishedAt: 'desc' }]
      : sort === 'views'
      ? [{ views: 'desc' }]
      : [{ views: 'desc' }, { publishedAt: 'desc' }];

    results.videos = await prisma.video.findMany({
      where: whereVideo,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { channel: { select: { id: true, name: true, handle: true, avatarUrl: true, isVerified: true } } },
    });
  }

  if (type === 'channel' || type === 'all') {
    results.channels = await prisma.channel.findMany({
      where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }, { handle: { contains: q, mode: 'insensitive' } }] },
      skip: type === 'channel' ? (page - 1) * limit : 0,
      take: type === 'channel' ? limit : 3,
    });
  }

  if (type === 'playlist' || type === 'all') {
    results.playlists = await prisma.playlist.findMany({
      where: { visibility: 'PUBLIC', OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] },
      include: { channel: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
      skip: type === 'playlist' ? (page - 1) * limit : 0,
      take: type === 'playlist' ? limit : 3,
    });
  }

  results.totalResults = results.videos.length + results.channels.length + results.playlists.length;
  results.searchTime = Date.now() - startTime;
  return results;
}

export async function search(options: SearchOptions): Promise<SearchResult> {
  const { q, type, sort, page, limit } = options;
  const startTime = Date.now();

  try {
    if (meiliAvailable && meiliClient && (type === 'all' || type === 'video')) {
      const meiliHits = await searchMeili(q, page, limit);
      if (meiliHits.length > 0) {
        const ids = meiliHits.map((h: any) => h.id);
        const videos = await prisma.video.findMany({
          where: { id: { in: ids }, status: 'PUBLISHED' },
          include: { channel: { select: { id: true, name: true, handle: true, avatarUrl: true, isVerified: true } } },
        });
        const idOrder = new Map(ids.map((id: string, i: number) => [id, i]));
        videos.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

        const results: SearchResult = { videos, channels: [], playlists: [], totalResults: videos.length, searchTime: Date.now() - startTime };

        if (type === 'all') {
          results.channels = await prisma.channel.findMany({
            where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { handle: { contains: q, mode: 'insensitive' } }] },
            take: 3,
          });
          results.playlists = await prisma.playlist.findMany({
            where: { visibility: 'PUBLIC', OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] },
            take: 3,
            include: { channel: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
          });
        }
        return results;
      }
    }
  } catch {
    console.warn('Meilisearch search failed, falling back to Prisma');
  }

  return searchPrisma(q, type, sort, page, limit);
}
