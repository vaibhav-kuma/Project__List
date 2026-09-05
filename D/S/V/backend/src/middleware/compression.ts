import { Request, Response, NextFunction } from 'express';

const COMPRESSIBLE_TYPES = [
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/xml',
  'image/svg+xml',
  'application/manifest+json',
];

const MIN_COMPRESS_LENGTH = 1024;

function shouldCompress(req: Request, res: Response): boolean {
  const acceptEncoding = req.headers['accept-encoding'] as string;
  if (!acceptEncoding) return false;

  const contentType = res.getHeader('content-type') as string;
  if (!contentType) return false;

  const contentLength = parseInt(res.getHeader('content-length') as string, 10);
  if (contentLength < MIN_COMPRESS_LENGTH) return false;

  return COMPRESSIBLE_TYPES.some((type) => contentType.includes(type));
}

function compressBuffer(buffer: Buffer, encoding: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const zlib = require('zlib');
    const cb = (err: Error | null, result: Buffer) => {
      if (err) reject(err);
      else resolve(result);
    };

    if (encoding === 'br') {
      zlib.brotliCompress(buffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } }, cb);
    } else if (encoding === 'gzip') {
      zlib.gzip(buffer, { level: 6 }, cb);
    } else if (encoding === 'deflate') {
      zlib.deflate(buffer, { level: 6 }, cb);
    } else {
      resolve(buffer);
    }
  });
}

export function compressionMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!shouldCompress(req, res)) {
      return next();
    }

    const acceptEncoding = req.headers['accept-encoding'] as string;
    let encoding: string;

    if (acceptEncoding.includes('br')) {
      encoding = 'br';
    } else if (acceptEncoding.includes('gzip')) {
      encoding = 'gzip';
    } else if (acceptEncoding.includes('deflate')) {
      encoding = 'deflate';
    } else {
      return next();
    }

    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    res.send = function (body: any): Response {
      if (typeof body === 'object') {
        body = JSON.stringify(body);
      }

      const buffer = Buffer.from(body);
      compressBuffer(buffer, encoding).then((compressed) => {
        res.setHeader('Content-Encoding', encoding);
        res.setHeader('Vary', 'Accept-Encoding');
        res.removeHeader('Content-Length');
        res.setHeader('Content-Length', compressed.length);
        originalSend(compressed);
      }).catch(() => {
        originalSend(body);
      });

      return res;
    } as any;

    res.json = function (body: any): Response {
      const data = JSON.stringify(body);
      const buffer = Buffer.from(data);

      res.setHeader('Content-Type', 'application/json');
      compressBuffer(buffer, encoding).then((compressed) => {
        res.setHeader('Content-Encoding', encoding);
        res.setHeader('Vary', 'Accept-Encoding');
        res.removeHeader('Content-Length');
        res.setHeader('Content-Length', compressed.length);
        originalSend(compressed);
      }).catch(() => {
        originalJson(body);
      });

      return res;
    } as any;

    next();
  };
}

export function cacheControlMiddleware(maxAge: number = 0, sMaxAge?: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const directives = [`public`, `max-age=${maxAge}`];
    if (sMaxAge !== undefined) {
      directives.push(`s-maxage=${sMaxAge}`);
    }
    if (maxAge === 0) {
      directives.push('must-revalidate');
    }
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', directives.join(', '));
    }
    next();
  };
}

export function etagMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const originalJson = res.json.bind(res);

    res.json = function (body: any): Response {
      const data = JSON.stringify(body);
      const etag = require('crypto')
        .createHash('md5')
        .update(data)
        .digest('hex');

      res.setHeader('ETag', `"${etag}"`);

      if (req.headers['if-none-match'] === `"${etag}"`) {
        res.status(304).end();
        return res;
      }

      return originalJson(body);
    } as any;

    next();
  };
}
