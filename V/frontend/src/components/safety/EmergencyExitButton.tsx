'use client';

import { useState } from 'react';
import { complianceApi } from '@/lib/complianceApi';

interface EmergencyExitButtonProps {
  sessionId?: string;
  onExit?: () => void;
  variant?: 'button' | 'icon';
}

export function EmergencyExitButton({ sessionId, onExit, variant = 'button' }: EmergencyExitButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exited, setExited] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);

  const handleEmergencyExit = async () => {
    setLoading(true);
    try {
      const { data } = await complianceApi.triggerEmergencyExit(sessionId);
      setEmergencyContacts(data.emergencyContacts || []);
      setExited(true);
      onExit?.();
    } catch (error) {
      console.error('Emergency exit failed:', error);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (exited) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Session Ended</h2>
            <p className="text-gray-600 mt-2">You have safely exited the conversation.</p>
          </div>

          {emergencyContacts.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-red-800 mb-2">Need Help?</h3>
              <div className="space-y-2">
                {emergencyContacts.map((contact, i) => (
                  <a
                    key={i}
                    href={`tel:${contact.number}`}
                    className="flex items-center justify-between p-2 bg-white rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{contact.name}</p>
                      <p className="text-sm text-gray-500">{contact.type}</p>
                    </div>
                    <span className="text-blue-600 font-bold">{contact.number}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <div className="text-center mb-4">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">End Session Now?</h3>
            <p className="text-sm text-gray-600 mt-1">This will immediately end your current conversation.</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleEmergencyExit}
              disabled={loading}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              {loading ? 'Exiting...' : 'End Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
        title="Emergency Exit"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6M21 12l-3-3M21 12l-3 3" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6M21 12l-3-3M21 12l-3 3" />
      </svg>
      Emergency Exit
    </button>
  );
}
