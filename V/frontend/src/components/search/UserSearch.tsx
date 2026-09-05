'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { PremiumBadge } from '@/components/ui/PremiumBadge';

interface SearchUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  age?: number;
  gender?: string;
  isVerified: boolean;
  status: string;
  lastActiveAt?: string;
  isPremium?: boolean;
}

interface SearchResult {
  users: SearchUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UserSearchProps {
  onSendRequest: (userId: string) => void;
  sendingTo?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function UserSearch({ onSendRequest, sendingTo }: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<SearchResult>('/users/search', {
        params: { q: trimmed, limit: 20 },
      });
      setResults(data.users);
      setSearched(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed');
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  return (
    <div>
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full pl-10 pr-4 py-2.5 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500 placeholder-gray-500 text-sm"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-500" />
          </div>
        )}
      </div>

      {error && (
        <div className="text-center py-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {searched && !loading && !error && results.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 text-5xl mb-3">🔍</div>
          <p className="text-gray-400">No users found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <div
              key={user.id}
              className="bg-gray-800 rounded-lg p-4 flex items-center gap-3"
            >
              <div className="relative">
                <div className="w-11 h-11 bg-gray-700 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    user.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-800 ${
                    user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white font-medium truncate">{user.displayName}</p>
                  {user.isPremium && <PremiumBadge size="sm" />}
                  {user.isVerified && (
                    <svg className="w-4 h-4 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {user.bio && (
                  <p className="text-gray-400 text-xs truncate">{user.bio}</p>
                )}
                <p className="text-gray-500 text-xs">
                  {user.age && `${user.age} yrs`}
                  {user.age && user.gender ? ' · ' : ''}
                  {user.gender}
                </p>
              </div>

              <button
                onClick={() => onSendRequest(user.id)}
                disabled={sendingTo === user.id}
                className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-sm transition whitespace-nowrap"
              >
                {sendingTo === user.id ? 'Sending...' : 'Add Friend'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
