'use client';
import { useState, useEffect } from 'react';
import { Skeleton } from '@yt/ui';
import { api } from '@/lib/api';
import { Search } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<{ success: boolean; data: any[] }>('/admin/users', { params: { search, limit: 50 } }).then((res) => {
      if (res.success) setUsers(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search users..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-yt-surface border border-yt-border rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 w-64"
          />
        </div>
      </div>

      <div className="bg-yt-surface rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-yt-border">
              <th className="text-left p-3 text-xs text-gray-400 font-medium">User</th>
              <th className="text-left p-3 text-xs text-gray-400 font-medium">Email</th>
              <th className="text-left p-3 text-xs text-gray-400 font-medium">Role</th>
              <th className="text-left p-3 text-xs text-gray-400 font-medium">Verified</th>
              <th className="text-left p-3 text-xs text-gray-400 font-medium">Joined</th>
              <th className="text-left p-3 text-xs text-gray-400 font-medium">Last Login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-yt-border hover:bg-yt-hover">
                <td className="p-3 text-sm text-white">{user.username}</td>
                <td className="p-3 text-sm text-gray-400">{user.email}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' : user.role === 'CREATOR' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>{user.role}</span></td>
                <td className="p-3 text-sm">{user.isVerified ? <span className="text-green-400">Yes</span> : <span className="text-gray-500">No</span>}</td>
                <td className="p-3 text-sm text-gray-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</td>
                <td className="p-3 text-sm text-gray-400">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
