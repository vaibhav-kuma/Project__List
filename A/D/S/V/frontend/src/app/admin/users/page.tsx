'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

interface User {
  id: string;
  email: string | null;
  displayName: string;
  age: number;
  gender: string;
  avatarUrl: string | null;
  status: string;
  isPremium: boolean;
  premiumTier: string;
  isVerified: boolean;
  isBanned: boolean;
  banReason: string | null;
  banExpiresAt: string | null;
  ageVerified: boolean;
  parentalConsent: boolean;
  lastActiveAt: string;
  createdAt: string;
  _count: {
    moments: number;
    friendsAsUser1: number;
    reportsReceived: number;
  };
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isPremiumFilter, setIsPremiumFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter, isPremiumFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (isPremiumFilter === 'true') params.isPremium = true;
      if (isPremiumFilter === 'false') params.isPremium = false;

      const { data } = await adminApi.getUsers(params);
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleBan = async (userId: string) => {
    try {
      await adminApi.banUser(userId, {
        reason: banReason,
        duration: banDuration ? parseInt(banDuration) : undefined,
      });
      setMessage({ type: 'success', text: 'User banned successfully' });
      setShowBanModal(false);
      setBanReason('');
      setBanDuration('');
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to ban user' });
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      await adminApi.unbanUser(userId);
      setMessage({ type: 'success', text: 'User unbanned successfully' });
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to unban user' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600">{total} users total</p>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <select
            value={isPremiumFilter}
            onChange={(e) => setIsPremiumFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Users</option>
            <option value="true">Premium Only</option>
            <option value="false">Free Only</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Search
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age/Gender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Premium</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.displayName} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-gray-500">{user.displayName.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.displayName}</p>
                          <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{user.age}</p>
                      <p className="text-sm text-gray-500">{user.gender}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.isBanned ? (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            Banned
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Active
                          </span>
                        )}
                        {user.ageVerified && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            Age Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.isPremium ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          {user.premiumTier}
                        </span>
                      ) : (
                        <span className="text-gray-500">Free</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        <p>{user._count.moments} moments</p>
                        <p>{user._count.friendsAsUser1} friends</p>
                        <p>{user._count.reportsReceived} reports</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {user.isBanned ? (
                          <button
                            onClick={() => handleUnban(user.id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowBanModal(true);
                            }}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                          >
                            Ban
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg text-sm font-medium"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg text-sm font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ban User</h2>
            <p className="text-gray-600 mb-4">
              Banning user: <span className="font-medium">{selectedUser?.displayName}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Reason for ban..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (hours, leave empty for permanent)
                </label>
                <input
                  type="number"
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 24, 168, 720"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setBanReason('');
                  setBanDuration('');
                }}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedUser && handleBan(selectedUser.id)}
                disabled={!banReason}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
