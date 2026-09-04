'use client';
import { useState } from 'react';
import { Button } from '@yt/ui';
import { useAuth } from '@/providers';
import { Sun, Moon, Globe, Bell, Shield, Play, Download } from 'lucide-react';

const settingsSections = [
  { id: 'account', label: 'Account', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'playback', label: 'Playback', icon: Play },
  { id: 'appearance', label: 'Appearance', icon: Sun },
  { id: 'language', label: 'Language & Region', icon: Globe },
  { id: 'downloads', label: 'Downloads', icon: Download },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('account');
  const [theme, setTheme] = useState('dark');
  const [autoplay, setAutoplay] = useState(true);
  const [quality, setQuality] = useState('auto');

  return (
    <div className="flex gap-6 p-6 max-w-[1200px] mx-auto">
      <aside className="w-56 shrink-0 hidden md:block">
        <h1 className="text-lg font-bold text-white mb-4">Settings</h1>
        <div className="space-y-0.5">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-yt-hover text-white font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-yt-hover'
                }`}
              >
                <Icon size={18} />
                {section.label}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex-1 max-w-2xl">
        <h1 className="text-xl font-bold text-white mb-6 md:hidden">Settings</h1>

        {activeSection === 'account' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-medium text-white mb-4">Account</h2>
              <div className="bg-yt-surface rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-sm text-white">{user?.email || 'Not signed in'}</p>
                  </div>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
                <div className="border-t border-yt-border pt-4">
                  <p className="text-sm text-gray-400 mb-2">Password</p>
                  <Button variant="secondary" size="sm">Change password</Button>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Connected accounts</h3>
              <div className="bg-yt-surface rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    <span className="text-sm text-white">Google</span>
                  </div>
                  <Button variant="secondary" size="sm">Connect</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                    <span className="text-sm text-white">GitHub</span>
                  </div>
                  <Button variant="secondary" size="sm">Connect</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'appearance' && (
          <div className="space-y-4">
            <h2 className="text-base font-medium text-white mb-4">Appearance</h2>
            <div className="bg-yt-surface rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Theme</span>
                <div className="flex gap-1 bg-yt-bg rounded-lg p-1">
                  {[
                    { value: 'light', icon: Sun, label: 'Light' },
                    { value: 'dark', icon: Moon, label: 'Dark' },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                          theme === t.value ? 'bg-yt-surface text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Icon size={16} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'playback' && (
          <div className="space-y-4">
            <h2 className="text-base font-medium text-white mb-4">Playback</h2>
            <div className="bg-yt-surface rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Autoplay</p>
                  <p className="text-xs text-gray-400">Play next video automatically</p>
                </div>
                <button
                  onClick={() => setAutoplay(!autoplay)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${autoplay ? 'bg-blue-600' : 'bg-yt-hover'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${autoplay ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="border-t border-yt-border pt-4 flex items-center justify-between">
                <p className="text-sm text-white">Default quality</p>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="bg-yt-bg border border-yt-border rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  <option value="auto">Auto</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                  <option value="360p">360p</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {(activeSection === 'notifications' || activeSection === 'language' || activeSection === 'downloads') && (
          <div className="text-center py-16 text-gray-400">
            <p>Settings section coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
