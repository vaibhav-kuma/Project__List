import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || 'videochat-media';
const CDN_URL = process.env.CDN_URL || `https://${BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

export interface UploadConfig {
  userId: string;
  fileName: string;
  contentType: string;
  isVideo?: boolean;
  visibility?: 'public' | 'private';
}

export interface UploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  thumbnailUrl?: string;
}

export class UploadService {
  async getPresignedUrl(config: UploadConfig): Promise<UploadResult> {
    const { userId, fileName, contentType, isVideo = false } = config;

    const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    if (!allowedTypes.includes(contentType)) {
      throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const extension = path.extname(fileName);
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().substr(0, 8);
    const folder = isVideo ? 'moments/videos' : 'moments/images';
    const key = `${folder}/${userId}/${timestamp}_${randomId}${extension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: config.visibility === 'private' ? 'private' : 'public-read',
      CacheControl: 'public, max-age=86400',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    const publicUrl = `${CDN_URL}/${key}`;

    let thumbnailUrl: string | undefined;
    if (isVideo) {
      const thumbnailKey = `${folder}/${userId}/${timestamp}_${randomId}_thumb.jpg`;
      thumbnailUrl = `${CDN_URL}/${thumbnailKey}`;
    }

    return { uploadUrl, publicUrl, key, thumbnailUrl };
  }

  async getAvatarUploadUrl(userId: string, fileName: string, contentType: string): Promise<UploadResult> {
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      throw new Error('Invalid avatar type. Use JPEG, PNG, or WebP.');
    }

    const extension = path.extname(fileName);
    const key = `avatars/${userId}/${Date.now()}${extension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: 'public-read',
      CacheControl: 'public, max-age=604800',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const publicUrl = `${CDN_URL}/${key}`;

    return { uploadUrl, publicUrl, key };
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    await s3Client.send(command);
  }

  async deleteMultipleFiles(keys: string[]): Promise<void> {
    const promises = keys.map((key) => this.deleteFile(key));
    await Promise.allSettled(promises);
  }

  async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  getPublicUrl(key: string): string {
    return `${CDN_URL}/${key}`;
  }

  generateThumbnailKey(originalKey: string): string {
    const ext = path.extname(originalKey);
    const base = originalKey.slice(0, -ext.length);
    return `${base}_thumb.jpg`;
  }

  async uploadThumbnail(userId: string, originalKey: string, thumbnailData: Buffer): Promise<string> {
    const thumbnailKey = this.generateThumbnailKey(originalKey);

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: thumbnailKey,
      Body: thumbnailData,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
      CacheControl: 'public, max-age=86400',
    });

    await s3Client.send(command);

    return this.getPublicUrl(thumbnailKey);
  }

  async cleanupExpiredFiles(keys: string[]): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    for (const key of keys) {
      try {
        await this.deleteFile(key);
        results.success.push(key);
      } catch (error) {
        results.failed.push(key);
      }
    }

    return results;
  }
}
