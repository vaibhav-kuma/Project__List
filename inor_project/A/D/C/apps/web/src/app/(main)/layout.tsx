'use client';
import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { AuthProvider } from '@/providers';
import { MobileBottomNav } from '@yt/ui';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <Navbar
        onMenuClick={() => {
          if (window.innerWidth < 768) {
            setMobileSidebarOpen(!mobileSidebarOpen);
          } else {
            setSidebarOpen(!sidebarOpen);
          }
        }}
      />
      <Sidebar
        collapsed={sidebarOpen ? false : true}
        onClose={mobileSidebarOpen ? () => setMobileSidebarOpen(false) : undefined}
      />
      <main
        className={`pt-14 transition-all duration-300 pb-16 md:pb-0 ${
          sidebarOpen ? 'md:ml-60' : 'md:ml-[72px]'
        }`}
      >
        {children}
      </main>
      <MobileBottomNav />
    </AuthProvider>
  );
}
