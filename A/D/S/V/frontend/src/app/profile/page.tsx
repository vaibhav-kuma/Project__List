'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import BottomNav from '@/components/ui/BottomNav';
import QRCode from 'qrcode.react';

export default function ProfilePage() {
  const { user, token, loading, fetchProfile, updateProfile, updatePrivacy, changePassword, deleteAccount, logout, setup2FA, enable2FA, disable2FA } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'security' | 'danger'>('profile');
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [privacySettings, setPrivacySettings] = useState({
    showAge: true,
    showGender: true,
    showLocation: false,
    allowMessagesFrom: 'friends',
    pushNotifications: true,
    emailNotifications: true,
    matchNotifications: true,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [twoFactorData, setTwoFactorData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    if (user) {
      setDisplayName(user.displayName);
      setBio(user.bio || '');
      setGender(user.gender);
      if (user.preferences) {
        setPrivacySettings({
          showAge: user.preferences.showAge ?? true,
          showGender: user.preferences.showGender ?? true,
          showLocation: user.preferences.showLocation ?? false,
          allowMessagesFrom: user.preferences.allowMessagesFrom ?? 'friends',
          pushNotifications: user.preferences.pushNotifications ?? true,
          emailNotifications: user.preferences.emailNotifications ?? true,
          matchNotifications: user.preferences.matchNotifications ?? true,
        });
      }
    }
  }, [user, loading, router]);

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ displayName, bio, gender });
      setEditing(false);
      showMessage('Profile updated', 'success');
    } catch {
      showMessage('Failed to update profile', 'error');
    }
  };

  const handleSavePrivacy = async () => {
    try {
      await updatePrivacy(privacySettings);
      showMessage('Privacy settings updated', 'success');
    } catch {
      showMessage('Failed to update privacy settings', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }
    try {
      await changePassword(passwordData);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showMessage('Password changed', 'success');
    } catch {
      showMessage('Failed to change password', 'error');
    }
  };

  const handleSetup2FA = async () => {
    try {
      const data = await setup2FA();
      setTwoFactorData(data);
    } catch {
      showMessage('Failed to setup 2FA', 'error');
    }
  };

  const handleEnable2FA = async () => {
    try {
      await enable2FA(twoFactorToken);
      setTwoFactorData(null);
      setTwoFactorToken('');
      showMessage('2FA enabled', 'success');
    } catch {
      showMessage('Invalid code', 'error');
    }
  };

  const handleDisable2FA = async () => {
    try {
      await disable2FA(twoFactorToken);
      setTwoFactorToken('');
      showMessage('2FA disabled', 'success');
    } catch {
      showMessage('Invalid code', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      showMessage('Type DELETE to confirm', 'error');
      return;
    }
    try {
      await deleteAccount(passwordData.currentPassword);
      router.push('/');
    } catch {
      showMessage('Failed to delete account', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">Profile</h1>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm"
              >
                Logout
              </button>
            </div>
          </div>

          {message && (
            <div className={`p-4 text-sm ${messageType === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
              {message}
            </div>
          )}

          <div className="flex border-b border-gray-700">
            {(['profile', 'privacy', 'security', 'danger'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition ${
                  activeTab === tab
                    ? 'text-primary-400 border-b-2 border-primary-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-3xl text-gray-400">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{user.displayName}</h2>
                    <p className="text-gray-400 text-sm">{user.email || user.phone}</p>
                    {!user.isVerified && (
                      <span className="text-yellow-400 text-xs">Not verified</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-white">{user.displayName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Age</label>
                  <p className="text-white">{user.age}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Gender</label>
                  {editing ? (
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non_binary">Non-binary</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  ) : (
                    <p className="text-white capitalize">{user.gender.replace('_', ' ')}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
                  {editing ? (
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      maxLength={500}
                    />
                  ) : (
                    <p className="text-white">{user.bio || 'No bio yet'}</p>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  {editing ? (
                    <>
                      <button
                        onClick={handleSaveProfile}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white mb-4">Privacy Settings</h2>

                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-gray-300">Show my age</span>
                    <input
                      type="checkbox"
                      checked={privacySettings.showAge}
                      onChange={(e) => setPrivacySettings({ ...privacySettings, showAge: e.target.checked })}
                      className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 bg-gray-700"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-300">Show my gender</span>
                    <input
                      type="checkbox"
                      checked={privacySettings.showGender}
                      onChange={(e) => setPrivacySettings({ ...privacySettings, showGender: e.target.checked })}
                      className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 bg-gray-700"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-300">Show my location</span>
                    <input
                      type="checkbox"
                      checked={privacySettings.showLocation}
                      onChange={(e) => setPrivacySettings({ ...privacySettings, showLocation: e.target.checked })}
                      className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 bg-gray-700"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Allow messages from</label>
                  <select
                    value={privacySettings.allowMessagesFrom}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, allowMessagesFrom: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="friends">Friends only</option>
                    <option value="none">Nobody</option>
                  </select>
                </div>

                <div className="space-y-3 pt-4">
                  <h3 className="text-sm font-medium text-gray-400">Notifications</h3>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-300">Push notifications</span>
                    <input
                      type="checkbox"
                      checked={privacySettings.pushNotifications}
                      onChange={(e) => setPrivacySettings({ ...privacySettings, pushNotifications: e.target.checked })}
                      className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 bg-gray-700"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-300">Email notifications</span>
                    <input
                      type="checkbox"
                      checked={privacySettings.emailNotifications}
                      onChange={(e) => setPrivacySettings({ ...privacySettings, emailNotifications: e.target.checked })}
                      className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 bg-gray-700"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-300">Match notifications</span>
                    <input
                      type="checkbox"
                      checked={privacySettings.matchNotifications}
                      onChange={(e) => setPrivacySettings({ ...privacySettings, matchNotifications: e.target.checked })}
                      className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 bg-gray-700"
                    />
                  </label>
                </div>

                <button
                  onClick={handleSavePrivacy}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg transition mt-4"
                >
                  Save Privacy Settings
                </button>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white mb-4">Security</h2>

                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Change Password</h3>
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <input
                      type="password"
                      placeholder="Current password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="submit"
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg transition"
                    >
                      Change Password
                    </button>
                  </form>
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Two-Factor Authentication</h3>

                  {user.twoFactorEnabled ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-sm">2FA is enabled</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter 2FA code to disable"
                        value={twoFactorToken}
                        onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        onClick={handleDisable2FA}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition"
                      >
                        Disable 2FA
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!twoFactorData ? (
                        <button
                          onClick={handleSetup2FA}
                          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg transition"
                        >
                          Setup 2FA
                        </button>
                      ) : (
                        <>
                          <div className="bg-gray-700 p-4 rounded-lg text-center">
                            <p className="text-sm text-gray-400 mb-3">Scan this QR code with your authenticator app</p>
                          <div className="bg-white p-2 rounded-lg inline-block">
                            <QRCode value={twoFactorData.otpauthUrl} size={180} />
                          </div>
                            <p className="text-xs text-gray-500 mt-2 font-mono">{twoFactorData.secret}</p>
                          </div>
                          <input
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={twoFactorToken}
                            onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6}
                            className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 text-center text-xl tracking-widest"
                          />
                          <button
                            onClick={handleEnable2FA}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition"
                          >
                            Enable 2FA
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>

                <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-red-400 mb-2">Delete Account</h3>
                  <p className="text-xs text-red-300 mb-4">
                    This action is irreversible. All your data, friends, and history will be permanently deleted.
                  </p>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 mb-3"
                  />
                  <input
                    type="text"
                    placeholder="Type DELETE to confirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 mb-3"
                  />
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => router.push('/chat')}
          className="mt-4 w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 rounded-lg transition"
        >
          Back to Chat
        </button>
      </div>

      <BottomNav />
    </main>
  );
}
