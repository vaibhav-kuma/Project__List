"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotIcon, LayoutDashboard, UserPlus, Zap } from "lucide-react";

const links = [
  { href: "/onboard",   label: "Onboard",   icon: UserPlus },
  { href: "/agent",     label: "Agent",     icon: Zap },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export default function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-500/40 transition-transform group-hover:scale-105">
            <BotIcon className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight gradient-text">
            AutoApply<span className="text-white/40 font-normal"> AI</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/30"
                    : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
