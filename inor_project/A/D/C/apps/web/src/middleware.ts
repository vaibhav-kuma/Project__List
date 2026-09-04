export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: ['/studio/:path*', '/admin/:path*', '/api/admin/:path*'],
};
