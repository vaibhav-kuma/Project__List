'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { complianceApi } from '@/lib/complianceApi';

interface ComplianceGuardProps {
  children: React.ReactNode;
  requireAgeVerification?: boolean;
  requireParentalConsent?: boolean;
  requireLegalConsent?: boolean;
  redirectPaths?: {
    ageVerification?: string;
    parentalConsent?: string;
    legalDocuments?: string;
  };
}

interface ComplianceStatus {
  ageVerified: boolean;
  isMinor: boolean;
  parentalConsent: boolean;
  privacyPolicyAccepted: boolean;
  termsAccepted: boolean;
  cookieConsent: boolean;
  dataProcessingConsent: boolean;
  accountDeletionRequested: boolean;
}

const EXEMPT_PATHS = [
  '/compliance/age-verification',
  '/compliance/parental-consent',
  '/legal/documents',
  '/compliance/gdpr',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
];

export function ComplianceGuard({
  children,
  requireAgeVerification = true,
  requireParentalConsent = true,
  requireLegalConsent = true,
  redirectPaths = {
    ageVerification: '/compliance/age-verification',
    parentalConsent: '/compliance/parental-consent',
    legalDocuments: '/legal/documents',
  },
}: ComplianceGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (EXEMPT_PATHS.some((path) => pathname?.startsWith(path))) {
      setLoading(false);
      return;
    }

    checkCompliance();
  }, [pathname]);

  const checkCompliance = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const [verificationRes, consentRes] = await Promise.allSettled([
        complianceApi.getAgeVerificationStatus(),
        complianceApi.getConsentStatus(),
      ]);

      const verification = verificationRes.status === 'fulfilled' ? verificationRes.value.data : null;
      const consent = consentRes.status === 'fulfilled' ? consentRes.value.data : null;

      const complianceStatus: ComplianceStatus = {
        ageVerified: verification?.ageVerified || false,
        isMinor: verification?.isMinor || false,
        parentalConsent: verification?.parentalConsent || false,
        privacyPolicyAccepted: consent?.privacyPolicyAccepted || false,
        termsAccepted: consent?.termsAccepted || false,
        cookieConsent: consent?.cookieConsent || false,
        dataProcessingConsent: consent?.dataProcessingConsent || false,
        accountDeletionRequested: false,
      };

      setStatus(complianceStatus);

      if (requireAgeVerification && !complianceStatus.ageVerified) {
        setRedirecting(true);
        router.push(redirectPaths.ageVerification!);
        return;
      }

      if (
        requireParentalConsent &&
        complianceStatus.isMinor &&
        !complianceStatus.parentalConsent
      ) {
        setRedirecting(true);
        router.push(redirectPaths.parentalConsent!);
        return;
      }

      if (requireLegalConsent) {
        const missingLegal =
          !complianceStatus.privacyPolicyAccepted ||
          !complianceStatus.termsAccepted;

        if (missingLegal) {
          setRedirecting(true);
          router.push(redirectPaths.legalDocuments!);
          return;
        }
      }
    } catch (error) {
      console.error('Compliance check failed:', error);
    } finally {
      setLoading(false);
      setRedirecting(false);
    }
  };

  if (loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (EXEMPT_PATHS.some((path) => pathname?.startsWith(path))) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

export function useCompliance() {
  const [status, setStatus] = useState<ComplianceStatus | null>(null);

  const checkStatus = async () => {
    try {
      const [verificationRes, consentRes] = await Promise.allSettled([
        complianceApi.getAgeVerificationStatus(),
        complianceApi.getConsentStatus(),
      ]);

      const verification = verificationRes.status === 'fulfilled' ? verificationRes.value.data : null;
      const consent = consentRes.status === 'fulfilled' ? consentRes.value.data : null;

      setStatus({
        ageVerified: verification?.ageVerified || false,
        isMinor: verification?.isMinor || false,
        parentalConsent: verification?.parentalConsent || false,
        privacyPolicyAccepted: consent?.privacyPolicyAccepted || false,
        termsAccepted: consent?.termsAccepted || false,
        cookieConsent: consent?.cookieConsent || false,
        dataProcessingConsent: consent?.dataProcessingConsent || false,
        accountDeletionRequested: false,
      });
    } catch (error) {
      console.error('Compliance status check failed:', error);
    }
  };

  return { status, checkStatus };
}
