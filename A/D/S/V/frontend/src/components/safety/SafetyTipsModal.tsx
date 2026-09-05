'use client';

import { useState, useEffect } from 'react';
import { complianceApi } from '@/lib/complianceApi';

interface SafetyTipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

interface SafetyTip {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'meeting' | 'online' | 'privacy' | 'reporting';
}

export function SafetyTipsModal({ isOpen, onClose, sessionId }: SafetyTipsModalProps) {
  const [tips, setTips] = useState<SafetyTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTip, setActiveTip] = useState(0);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTips();
    }
  }, [isOpen]);

  const fetchTips = async () => {
    setLoading(true);
    try {
      const { data } = await complianceApi.getSafetyTips();
      setTips(data.tips || []);
    } catch (error) {
      console.error('Failed to fetch safety tips:', error);
      setTips(getDefaultTips());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTips = (): SafetyTip[] => [
    {
      id: '1',
      title: 'Protect Your Personal Information',
      content: 'Never share your home address, phone number, or financial details with someone you just met.',
      category: 'privacy',
    },
    {
      id: '2',
      title: 'Meet in Public Places',
      content: 'Always arrange first meetings in busy, public locations. Tell a friend or family member where you are going.',
      category: 'meeting',
    },
    {
      id: '3',
      title: 'Trust Your Instincts',
      content: 'If something feels wrong, it probably is. Use the emergency exit button to end any conversation immediately.',
      category: 'general',
    },
    {
      id: '4',
      title: 'Report Suspicious Behavior',
      content: 'If someone asks for money, makes inappropriate requests, or seems fake, report them immediately.',
      category: 'reporting',
    },
    {
      id: '5',
      title: 'Keep Conversations on the Platform',
      content: 'Be cautious about moving conversations to external messaging apps too quickly.',
      category: 'online',
    },
  ];

  const handleReportSuspicious = async () => {
    if (!sessionId) return;
    try {
      await complianceApi.reportSuspiciousBehavior({
        sessionId,
        warningType: 'general_concern',
      });
      setReported(true);
    } catch (error) {
      console.error('Failed to report:', error);
    }
  };

  if (!isOpen) return null;

  const currentTip = tips[activeTip] || getDefaultTips()[activeTip];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Safety Tips</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <span className="inline-block px-2 py-1 bg-blue-200 text-blue-800 text-xs font-medium rounded-full mb-2">
                  {currentTip?.category}
                </span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{currentTip?.title}</h3>
                <p className="text-gray-700">{currentTip?.content}</p>
              </div>

              <div className="flex justify-center gap-2 mb-6">
                {tips.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTip(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === activeTip ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {sessionId && !reported && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Feeling uncomfortable?</h4>
                  <p className="text-sm text-red-700 mb-3">
                    You can report suspicious behavior and end this session immediately.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleReportSuspicious}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm"
                    >
                      Report & End Session
                    </button>
                  </div>
                </div>
              )}

              {reported && (
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <svg className="w-8 h-8 text-green-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-800 font-medium">Report submitted successfully</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => setActiveTip((activeTip - 1 + tips.length) % tips.length)}
            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
          >
            Previous
          </button>
          <button
            onClick={() => setActiveTip((activeTip + 1) % tips.length)}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Next Tip
          </button>
        </div>
      </div>
    </div>
  );
}
