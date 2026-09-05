'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { complianceApi } from '@/lib/complianceApi';

type VerificationMethod = 'document_upload' | 'id_verification_api' | 'ml_estimation' | 'parental_consent';

interface VerificationStatus {
  ageVerified: boolean;
  method: string | null;
  status: string;
  isMinor: boolean;
  parentalConsent: boolean;
}

export default function AgeVerification() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod | null>(null);
  const [documentType, setDocumentType] = useState('passport');
  const [idProvider, setIdProvider] = useState('veriff');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data } = await complianceApi.getAgeVerificationStatus();
      setStatus(data);
      if (data.ageVerified) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMethod) return;
    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      await complianceApi.submitAgeVerification({
        method: selectedMethod,
        documentType: selectedMethod === 'document_upload' ? documentType : undefined,
        idVerificationProvider: selectedMethod === 'id_verification_api' ? idProvider : undefined,
      });

      if (selectedMethod === 'parental_consent') {
        setMessage({
          type: 'success',
          text: 'Parental consent request initiated. Check your email for next steps.',
        });
      } else {
        setMessage({
          type: 'success',
          text: 'Verification submitted. You will be notified once it is reviewed.',
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Verification failed',
      });
    } finally {
      setUploading(false);
    }
  };

  const methods: { value: VerificationMethod; title: string; description: string; icon: string }[] = [
    {
      value: 'document_upload',
      title: 'Document Upload',
      description: 'Upload a government-issued ID or passport',
      icon: '📄',
    },
    {
      value: 'id_verification_api',
      title: 'ID Verification API',
      description: 'Verify instantly using a trusted provider',
      icon: '🔐',
    },
    {
      value: 'ml_estimation',
      title: 'AI Age Estimation',
      description: 'Use facial analysis to estimate your age',
      icon: '🤖',
    },
    {
      value: 'parental_consent',
      title: 'Parental Consent',
      description: 'Have a parent or guardian verify your age',
      icon: '👨‍👩‍👧',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Age Verification</h1>
          <p className="text-gray-600 mt-2">
            We need to verify your age to comply with COPPA and GDPR regulations.
          </p>
        </div>

        {message.text && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Verification Method</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {methods.map((method) => (
                <button
                  key={method.value}
                  onClick={() => {
                    setSelectedMethod(method.value);
                    setStep(2);
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedMethod === method.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{method.icon}</div>
                  <h3 className="font-semibold text-gray-900">{method.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{method.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selectedMethod === 'document_upload' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Document</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver&apos;s License</option>
                <option value="national_id">National ID Card</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                </label>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={uploading || !file}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              {uploading ? 'Uploading...' : 'Submit for Verification'}
            </button>
          </div>
        )}

        {step === 2 && selectedMethod === 'id_verification_api' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">ID Verification</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Verification Provider</label>
              <select
                value={idProvider}
                onChange={(e) => setIdProvider(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="veriff">Veriff</option>
                <option value="onfido">Onfido</option>
                <option value="jumio">Jumio</option>
              </select>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                You will be redirected to {idProvider}&apos;s secure verification page to complete the process.
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              {uploading ? 'Redirecting...' : 'Start Verification'}
            </button>
          </div>
        )}

        {step === 2 && selectedMethod === 'ml_estimation' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Age Estimation</h2>

            <div className="bg-yellow-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                Our AI will analyze your facial features to estimate your age. This requires camera access and multiple frames.
              </p>
            </div>

            <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center mb-6">
              <p className="text-gray-500">Camera preview would appear here</p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              {uploading ? 'Analyzing...' : 'Start Camera'}
            </button>
          </div>
        )}

        {step === 2 && selectedMethod === 'parental_consent' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Parental Consent</h2>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                A consent request will be sent to your parent or guardian. They will need to verify their identity and approve access.
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              {uploading ? 'Sending...' : 'Request Parental Consent'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
