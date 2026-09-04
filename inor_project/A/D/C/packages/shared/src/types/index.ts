export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  subscriberCount: number;
  isVerified: boolean;
  role: string;
  createdAt: string;
}

export interface ChannelProfile {
  id: string;
  handle: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  subscriberCount: number;
  videoCount: number;
  totalViews: string;
  isVerified: boolean;
  customUrl: string | null;
  country: string | null;
  createdAt: string;
}

export interface VideoData {
  id: string;
  channelId: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  previewGifUrl: string | null;
  duration: number;
  views: string;
  likes: number;
  dislikes: number;
  status: string;
  category: string | null;
  tags: string[];
  allowComments: boolean;
  ageRestricted: boolean;
  language: string;
  isShort: boolean;
  publishedAt: string | null;
  createdAt: string;
  channel?: ChannelProfile;
}

export interface CommentData {
  id: string;
  videoId: string;
  userId: string;
  parentId: string | null;
  content: string;
  likes: number;
  dislikes: number;
  isEdited: boolean;
  isPinned: boolean;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  replies?: CommentData[];
  replyCount?: number;
}

export interface PlaylistData {
  id: string;
  channelId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  visibility: string;
  videoCount: number;
  createdAt: string;
  channel?: ChannelProfile;
  videos?: PlaylistVideoData[];
}

export interface PlaylistVideoData {
  id: string;
  position: number;
  addedAt: string;
  video: VideoData;
}

export interface NotificationData {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  thumbnailUrl: string | null;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface SubscriptionData {
  id: string;
  channelId: string;
  notifications: string;
  createdAt: string;
  channel: ChannelProfile;
}

export interface SearchResult {
  videos: VideoData[];
  channels: ChannelProfile[];
  playlists: PlaylistData[];
  totalResults: number;
  searchTime: number;
}

export interface UploadConfig {
  uploadId: string;
  presignedUrl: string;
  videoId: string;
  expiresIn: number;
}

export interface AnalyticsData {
  views: number[];
  watchTime: number[];
  subscribers: number[];
  dates: string[];
  topVideos: VideoData[];
  trafficSources: { source: string; count: number }[];
}
