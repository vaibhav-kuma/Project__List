'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { complianceApi } from '@/lib/complianceApi';

interface LegalDocument {
  id: string;
  type: string;
  title: string;
  content: string;
  version: string;
  effectiveDate: string;
  language: string;
}

interface ConsentStatus {
  privacyPolicyAccepted: boolean;
  privacyPolicyVersion: string | null;
  termsAccepted: boolean;
  termsVersion: string | null;
  cookieConsent: boolean;
  dataProcessingConsent: boolean;
}

const documentTypes = [
  { value: 'privacy_policy', label: 'Privacy Policy' },
  { value: 'terms_of_service', label: 'Terms of Service' },
  { value: 'cookie_policy', label: 'Cookie Policy' },
  { value: 'data_processing_agreement', label: 'Data Processing Agreement' },
];

function LegalDocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || 'privacy_policy');
  const [currentDoc, setCurrentDoc] = useState<LegalDocument | null>(null);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (documents.length > 0) {
      const doc = documents.find((d) => d.type === selectedType);
      setCurrentDoc(doc || null);
    }
  }, [selectedType, documents]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes, statusRes] = await Promise.all([
        complianceApi.getAllLegalDocuments(),
        complianceApi.getConsentStatus(),
      ]);
      setDocuments(docsRes.data.documents || []);
      setConsentStatus(statusRes.data);
    } catch (error) {
      console.error('Failed to fetch legal documents:', error);
      setMessage({ type: 'error', text: 'Failed to load documents' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAccept = async () => {
    if (!currentDoc) return;
    setAccepting(true);
    setMessage({ type: '', text: '' });

    try {
      await complianceApi.acceptLegalDocument({
        documentType: currentDoc.type,
        version: currentDoc.version,
      });
      setMessage({ type: 'success', text: `${currentDoc.title} accepted` });
      fetchData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to accept document',
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleAcceptAll = async () => {
    setAccepting(true);
    setMessage({ type: '', text: '' });

    try {
      const pendingDocs = documents.filter(
        (doc) => !isDocumentAccepted(doc.type, doc.version)
      );

      for (const doc of pendingDocs) {
        await complianceApi.acceptLegalDocument({
          documentType: doc.type,
          version: doc.version,
        });
      }

      setMessage({ type: 'success', text: 'All documents accepted' });
      fetchData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to accept documents',
      });
    } finally {
      setAccepting(false);
    }
  };

  const isDocumentAccepted = (type: string, version: string) => {
    if (!consentStatus) return false;
    switch (type) {
      case 'privacy_policy':
        return consentStatus.privacyPolicyAccepted && consentStatus.privacyPolicyVersion === version;
      case 'terms_of_service':
        return consentStatus.termsAccepted && consentStatus.termsVersion === version;
      case 'cookie_policy':
        return consentStatus.cookieConsent;
      case 'data_processing_agreement':
        return consentStatus.dataProcessingConsent;
      default:
        return false;
    }
  };

  const getPendingCount = () => {
    return documents.filter((doc) => !isDocumentAccepted(doc.type, doc.version)).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Legal Documents</h1>
            <p className="text-gray-600 mt-1">Review and accept our legal agreements</p>
          </div>
          {getPendingCount() > 0 && (
            <button
              onClick={handleAcceptAll}
              disabled={accepting}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              Accept All ({getPendingCount()})
            </button>
          )}
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

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {documentTypes.map((type) => {
                const doc = documents.find((d) => d.type === type.value);
                const accepted = doc && isDocumentAccepted(doc.type, doc.version);
                const isSelected = type.value === selectedType;

                return (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      isSelected
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {type.label}
                    {accepted && (
                      <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {currentDoc && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{currentDoc.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Version {currentDoc.version} • Effective{' '}
                    {new Date(currentDoc.effectiveDate).toLocaleDateString()}
                  </p>
                </div>
                {isDocumentAccepted(currentDoc.type, currentDoc.version) ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Accepted
                  </span>
                ) : (
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
                  >
                    {accepting ? 'Accepting...' : 'Accept'}
                  </button>
                )}
              </div>

              <div className="prose max-w-none bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                <div
                  className="text-gray-700 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: currentDoc.content }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
          >
            Back
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Continue to App
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LegalDocumentViewer() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <LegalDocumentsContent />
    </Suspense>
  );
}
