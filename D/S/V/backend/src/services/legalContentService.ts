import prisma from '../config/database';
import logger from '../config/logger';

export type LegalDocumentType = 'terms_of_service' | 'privacy_policy' | 'community_guidelines' | 'cookie_policy' | 'data_processing_agreement' | 'parental_consent_form';

export interface LegalDocument {
  id: string;
  documentType: LegalDocumentType;
  version: string;
  title: string;
  content: string;
  language: string;
  isActive: boolean;
  effectiveDate: Date;
  createdAt: Date;
}

class LegalContentService {
  async getActiveDocument(type: LegalDocumentType, language: string = 'en'): Promise<LegalDocument | null> {
    const document = await prisma.legalDocument.findFirst({
      where: {
        documentType: type,
        language,
        isActive: true,
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!document) {
      return this.getFallbackDocument(type, language);
    }

    return document as LegalDocument;
  }

  async getAllActiveDocuments(language: string = 'en'): Promise<LegalDocument[]> {
    const documents = await prisma.legalDocument.findMany({
      where: {
        language,
        isActive: true,
      },
      orderBy: { effectiveDate: 'desc' },
    });

    const latest: Record<string, LegalDocument> = {};
    documents.forEach((doc) => {
      if (!latest[doc.documentType]) {
        latest[doc.documentType] = doc as LegalDocument;
      }
    });

    return Object.values(latest);
  }

  async createDocument(data: {
    documentType: LegalDocumentType;
    version: string;
    title: string;
    content: string;
    language?: string;
    effectiveDate?: Date;
  }): Promise<LegalDocument> {
    const existing = await prisma.legalDocument.findFirst({
      where: {
        documentType: data.documentType,
        language: data.language || 'en',
        isActive: true,
      },
    });

    if (existing) {
      await prisma.legalDocument.update({
        where: { id: existing.id },
        data: {
          isActive: false,
          supersededById: undefined,
        },
      });
    }

    const document = await prisma.legalDocument.create({
      data: {
        documentType: data.documentType,
        version: data.version,
        title: data.title,
        content: data.content,
        language: data.language || 'en',
        isActive: true,
        effectiveDate: data.effectiveDate || new Date(),
      },
    });

    logger.info(`Legal document created: ${data.documentType} v${data.version}`);

    return document as LegalDocument;
  }

  async acceptDocument(userId: string, type: LegalDocumentType, version: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const document = await prisma.legalDocument.findFirst({
      where: { documentType: type, version, isActive: true },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const updateData: any = {};

    switch (type) {
      case 'privacy_policy':
        updateData.privacyPolicyAccepted = true;
        updateData.privacyPolicyAcceptedAt = new Date();
        break;
      case 'terms_of_service':
        updateData.termsAccepted = true;
        updateData.termsAcceptedAt = new Date();
        break;
      case 'cookie_policy':
        updateData.cookieConsent = true;
        updateData.cookieConsentAt = new Date();
        break;
      case 'data_processing_agreement':
        updateData.dataProcessingConsent = true;
        break;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await prisma.userConsentLog.create({
      data: {
        userId,
        documentType: type,
        documentVersion: version,
        consentGiven: true,
        ipAddress,
        userAgent,
      },
    });

    logger.info(`User ${userId} accepted ${type} v${version}`);
  }

  async getUserConsentStatus(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: true,
        termsAccepted: true,
        termsAcceptedAt: true,
        cookieConsent: true,
        cookieConsentAt: true,
        dataProcessingConsent: true,
        marketingConsent: true,
      },
    });

    const documents = await this.getAllActiveDocuments();

    return {
      user,
      requiredDocuments: documents.map((d) => ({
        type: d.documentType,
        version: d.version,
        title: d.title,
        effectiveDate: d.effectiveDate,
      })),
    };
  }

  private getFallbackDocument(type: LegalDocumentType, language: string): LegalDocument | null {
    const fallbacks: Record<string, Partial<LegalDocument>> = {
      terms_of_service: {
        documentType: 'terms_of_service',
        version: '1.0.0',
        title: 'Terms of Service',
        content: this.getTermsOfServiceContent(),
        language,
        isActive: true,
        effectiveDate: new Date(),
      },
      privacy_policy: {
        documentType: 'privacy_policy',
        version: '1.0.0',
        title: 'Privacy Policy',
        content: this.getPrivacyPolicyContent(),
        language,
        isActive: true,
        effectiveDate: new Date(),
      },
      community_guidelines: {
        documentType: 'community_guidelines',
        version: '1.0.0',
        title: 'Community Guidelines',
        content: this.getCommunityGuidelinesContent(),
        language,
        isActive: true,
        effectiveDate: new Date(),
      },
      cookie_policy: {
        documentType: 'cookie_policy',
        version: '1.0.0',
        title: 'Cookie Policy',
        content: this.getCookiePolicyContent(),
        language,
        isActive: true,
        effectiveDate: new Date(),
      },
      data_processing_agreement: {
        documentType: 'data_processing_agreement',
        version: '1.0.0',
        title: 'Data Processing Agreement',
        content: this.getDataProcessingAgreementContent(),
        language,
        isActive: true,
        effectiveDate: new Date(),
      },
      parental_consent_form: {
        documentType: 'parental_consent_form',
        version: '1.0.0',
        title: 'Parental Consent Form',
        content: this.getParentalConsentFormContent(),
        language,
        isActive: true,
        effectiveDate: new Date(),
      },
    };

    const fallback = fallbacks[type];
    if (!fallback) return null;

    return {
      id: `fallback_${type}`,
      ...fallback,
    } as LegalDocument;
  }

  private getTermsOfServiceContent(): string {
    return `
# Terms of Service

## 1. Acceptance of Terms
By accessing or using Ninor ("the Service"), you agree to be bound by these Terms of Service.

## 2. Eligibility
You must be at least 13 years old to use this Service. Users under 18 require parental consent.

## 3. User Conduct
- You must not engage in harassment, abuse, or threatening behavior
- You must not share explicit content with minors
- You must not impersonate other users
- You must not use the Service for commercial purposes without authorization

## 4. Content
- You retain ownership of content you create
- You grant Ninor a license to display and distribute your content
- You are responsible for content you share

## 5. Safety
- Use the emergency exit feature if you feel unsafe
- Report inappropriate behavior immediately
- Do not share personal information with strangers

## 6. Termination
We reserve the right to terminate accounts that violate these terms.

## 7. Limitation of Liability
Ninor is not liable for interactions between users.

## 8. Changes to Terms
We will notify users of material changes to these terms.

Last updated: ${new Date().toISOString().split('T')[0]}
    `.trim();
  }

  private getPrivacyPolicyContent(): string {
    return `
# Privacy Policy

## 1. Information We Collect
- Account information (email, display name, age)
- Usage data (sessions, matches, messages)
- Device information and IP address
- Content you create (moments, profile information)

## 2. How We Use Information
- To provide and improve the Service
- To match you with other users
- To ensure safety and moderate content
- To comply with legal obligations

## 3. Data Sharing
- We do not sell personal information
- We may share data with service providers
- We may disclose data when required by law

## 4. Data Retention
- Account data is retained until deletion
- Deleted accounts are processed within 30 days
- Some data may be retained for legal compliance

## 5. Your Rights (GDPR)
- Right to access your data
- Right to rectification
- Right to erasure
- Right to data portability
- Right to object to processing

## 6. Children's Privacy
- We comply with COPPA for users under 13
- Parental consent is required for minors
- Limited data collection for minor accounts

## 7. Security
- We use encryption for data in transit
- Access to personal data is restricted
- Regular security audits are conducted

## 8. Contact
For privacy concerns: privacy@ninor.com

Last updated: ${new Date().toISOString().split('T')[0]}
    `.trim();
  }

  private getCommunityGuidelinesContent(): string {
    return `
# Community Guidelines

## 1. Respect Others
- Treat all users with respect and dignity
- No harassment, bullying, or discrimination
- No hate speech or derogatory language

## 2. Age-Appropriate Content
- No explicit content with or directed at minors
- All users must be accurately represented
- Age verification is required for all users

## 3. Safety First
- Do not share personal information
- Report suspicious behavior immediately
- Use emergency exit if you feel unsafe

## 4. Authentic Interactions
- Be honest about your identity
- No catfishing or impersonation
- No spam or commercial solicitation

## 5. Content Standards
- No nudity or explicit content
- No violence or threats
- No illegal activities

## 6. Enforcement
- Violations may result in warnings, temporary bans, or permanent bans
- Severe violations result in immediate permanent bans
- Appeals can be submitted through the app

## 7. Reporting
- Use the in-app report feature
- Provide evidence when possible
- False reporting may result in account action

Last updated: ${new Date().toISOString().split('T')[0]}
    `.trim();
  }

  private getCookiePolicyContent(): string {
    return `
# Cookie Policy

## 1. What Are Cookies
Cookies are small text files stored on your device.

## 2. Cookies We Use
- **Necessary**: Essential for the Service to function
- **Functional**: Remember your preferences
- **Analytics**: Help us understand usage patterns
- **Marketing**: Used for advertising purposes

## 3. Managing Cookies
You can control cookies through your browser settings.

## 4. Third-Party Cookies
We use services that may set their own cookies.

## 5. Consent
By using the Service, you consent to our use of cookies.

Last updated: ${new Date().toISOString().split('T')[0]}
    `.trim();
  }

  private getDataProcessingAgreementContent(): string {
    return `
# Data Processing Agreement

## 1. Parties
This agreement is between Ninor (Data Controller) and the User (Data Subject).

## 2. Processing Activities
- Account management
- User matching
- Content moderation
- Analytics and improvement

## 3. Legal Basis
- Consent (Article 6(1)(a) GDPR)
- Contract performance (Article 6(1)(b) GDPR)
- Legitimate interests (Article 6(1)(f) GDPR)

## 4. Data Transfers
Data may be transferred to service providers in accordance with GDPR Chapter V.

## 5. Data Subject Rights
Users have the right to access, rectify, erase, and port their data.

## 6. Data Breach Notification
We will notify users of data breaches within 72 hours.

Last updated: ${new Date().toISOString().split('T')[0]}
    `.trim();
  }

  private getParentalConsentFormContent(): string {
    return `
# Parental Consent Form

## Child Information
- Child's Name: [Child Name]
- Child's Age: [Age]
- Parent/Guardian Name: [Parent Name]

## Consent Declaration
I, the undersigned parent/guardian, hereby grant consent for my child to use the Ninor video chat application.

## I Understand That:
- Ninor connects users for random video chats
- Content moderation is active but not guaranteed
- My child may encounter inappropriate content
- I can revoke consent at any time
- My child's data will be processed per the Privacy Policy

## Restrictions I Wish to Apply:
- [ ] Limit daily matches to 5
- [ ] No video chat with strangers
- [ ] No messaging
- [ ] Time restrictions (8 AM - 8 PM)

## Signature
By clicking "I Consent" below, I confirm that I am the parent or legal guardian of the child named above and I grant consent for their use of Ninor.

Last updated: ${new Date().toISOString().split('T')[0]}
    `.trim();
  }
}

export const legalContentService = new LegalContentService();
