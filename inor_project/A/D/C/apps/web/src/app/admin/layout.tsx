'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@yt/shared';
import { AuthProvider } from '@/providers';
import { LayoutDashboard, Users, Video, Flag, MessageCircle, Shield, Activity } from 'lucide-react';

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/videos', label: 'Videos', icon: Video },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '#', label: 'Comments', icon: MessageCircle },
  { href: '#', label: 'Policies', icon: Shield },
  { href: '#', label: 'System Health', icon: Activity },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#030303]">
        <header className="h-14 bg-[#030303] border-b border-[#3a3a3a] flex items-center px-6 fixed top-0 left-0 right-0 z-40">
          <h1 className="text-lg font-bold text-white">Admin Panel</h1>
        </header>
        <div className="flex pt-14">
          <aside className="w-56 bg-[#030303] border-r border-[#3a3a3a] fixed left-0 top-14 bottom-0 overflow-y-auto">
            <div className="py-2">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                    pathname === link.href ? 'bg-yt-hover text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-yt-hover',
                  )}
                >
                  <link.icon size={18} />
                  {link.label}
                </Link>
              ))}
            </div>
          </aside>
          <main className="flex-1 ml-56">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
