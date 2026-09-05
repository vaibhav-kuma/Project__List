import nodemailer from 'nodemailer';
import logger from '../config/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async send(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('SMTP not configured, skipping email');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@ninor.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info(`Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  async sendModerationEmail(
    email: string,
    displayName: string,
    actionType: string,
    reason: string,
    expiresAt?: Date
  ): Promise<boolean> {
    const subjects: Record<string, string> = {
      warning: 'Warning: Community Guidelines Violation',
      temporary_ban: 'Temporary Suspension Notice',
      permanent_ban: 'Permanent Ban Notice',
      shadow_ban: 'Account Restriction Notice',
      feature_restriction: 'Feature Restriction Notice',
    };

    const messages: Record<string, string> = {
      warning: `
        <h2>Warning Issued</h2>
        <p>Dear ${displayName},</p>
        <p>We have issued a warning to your account due to a violation of our community guidelines.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please review our <a href="${process.env.FRONTEND_URL}/guidelines">Community Guidelines</a> to understand what is expected.</p>
        <p>Further violations may result in temporary or permanent suspension of your account.</p>
      `,
      temporary_ban: `
        <h2>Temporary Suspension</h2>
        <p>Dear ${displayName},</p>
        <p>Your account has been temporarily suspended due to a violation of our community guidelines.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Suspension Duration:</strong> ${expiresAt ? `Until ${expiresAt.toLocaleString()}` : '7 days'}</p>
        <p>During this time, you will not be able to access the platform.</p>
        <p>If you believe this action was taken in error, you can <a href="${process.env.FRONTEND_URL}/appeals">submit an appeal</a>.</p>
      `,
      permanent_ban: `
        <h2>Permanent Ban</h2>
        <p>Dear ${displayName},</p>
        <p>Your account has been permanently banned from our platform due to severe or repeated violations of our community guidelines.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>This decision is final. However, you may <a href="${process.env.FRONTEND_URL}/appeals">submit an appeal</a> if you believe this action was taken in error.</p>
      `,
      shadow_ban: `
        <h2>Account Restriction</h2>
        <p>Dear ${displayName},</p>
        <p>Your account has been restricted due to violations of our community guidelines.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Some features may be limited. Please review our guidelines to restore full access.</p>
      `,
      feature_restriction: `
        <h2>Feature Restriction</h2>
        <p>Dear ${displayName},</p>
        <p>Some features of your account have been restricted due to violations of our community guidelines.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please review our guidelines to understand what is expected.</p>
      `,
    };

    return this.send({
      to: email,
      subject: subjects[actionType] || 'Moderation Action Notice',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            ${messages[actionType] || '<p>Moderation action taken on your account.</p>'}
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 12px;">
              This is an automated message. Please do not reply to this email.<br>
              If you have questions, contact us at <a href="mailto:support@ninor.com">support@ninor.com</a>
            </p>
          </div>
        </div>
      `,
    });
  }

  async sendAppealStatusEmail(
    email: string,
    displayName: string,
    appealStatus: 'approved' | 'denied' | 'under_review',
    reason?: string
  ): Promise<boolean> {
    const subjects: Record<string, string> = {
      approved: 'Appeal Approved',
      denied: 'Appeal Denied',
      under_review: 'Appeal Under Review',
    };

    const messages: Record<string, string> = {
      approved: `
        <h2>Appeal Approved</h2>
        <p>Dear ${displayName},</p>
        <p>Your appeal has been reviewed and approved. Your account restrictions have been lifted.</p>
        <p>We appreciate your patience and commitment to our community guidelines.</p>
      `,
      denied: `
        <h2>Appeal Denied</h2>
        <p>Dear ${displayName},</p>
        <p>After careful review, your appeal has been denied.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>The moderation action on your account remains in effect.</p>
      `,
      under_review: `
        <h2>Appeal Under Review</h2>
        <p>Dear ${displayName},</p>
        <p>Your appeal has been received and is currently under review by our moderation team.</p>
        <p>We will notify you once a decision has been made.</p>
      `,
    };

    return this.send({
      to: email,
      subject: subjects[appealStatus],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            ${messages[appealStatus]}
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    });
  }

  async sendReportUpdateEmail(
    email: string,
    displayName: string,
    reportId: string,
    status: string,
    notes?: string
  ): Promise<boolean> {
    return this.send({
      to: email,
      subject: 'Report Update',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Report Update</h2>
          <p>Dear ${displayName},</p>
          <p>Your report (ID: ${reportId}) has been updated.</p>
          <p><strong>Status:</strong> ${status}</p>
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          <p>Thank you for helping keep our community safe.</p>
        </div>
      `,
    });
  }

  async sendParentalConsentEmail(
    parentEmail: string,
    parentName: string,
    childName: string,
    consentToken: string,
    consentUrl: string
  ): Promise<boolean> {
    return this.send({
      to: parentEmail,
      subject: 'Parental Consent Required for Ninor App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Parental Consent Request</h2>
          <p>Dear ${parentName},</p>
          <p>Your child <strong>${childName}</strong> has requested to use Ninor, a video chat application.</p>
          <p>Since your child is under 18, we require your consent before they can use the app. This helps us comply with COPPA and other child protection regulations.</p>
          
          <h3>What you should know:</h3>
          <ul>
            <li>Ninor connects users for random video chats</li>
            <li>We have safety features including content moderation and reporting</li>
            <li>You can set restrictions on your child's usage</li>
            <li>You can revoke consent at any time</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${consentUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Review & Grant Consent
            </a>
          </div>

          <p>This link will expire in 7 days. If you did not expect this request, please ignore this email.</p>

          <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; font-size: 12px;">
            This is an automated message. Contact us at <a href="mailto:safety@ninor.com">safety@ninor.com</a>
          </p>
        </div>
      `,
    });
  }

  async sendConsentApprovedEmail(email: string, displayName: string): Promise<boolean> {
    return this.send({
      to: email,
      subject: 'Parental Consent Granted - Welcome to Ninor!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Consent Granted</h2>
          <p>Dear ${displayName},</p>
          <p>Great news! Your parent has granted consent for you to use Ninor.</p>
          <p>You can now enjoy the app with the following safety settings:</p>
          <ul>
            <li>Limited daily matches</li>
            <li>Content moderation active</li>
            <li>Time restrictions may apply</li>
          </ul>
          <p>Remember to stay safe online and report any inappropriate behavior.</p>
        </div>
      `,
    });
  }

  async sendConsentRevokedEmail(email: string, displayName: string): Promise<boolean> {
    return this.send({
      to: email,
      subject: 'Parental Consent Revoked',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Consent Revoked</h2>
          <p>Dear ${displayName},</p>
          <p>Parental consent for your Ninor account has been revoked.</p>
          <p>Your account is now in restricted mode. Please contact your parent or guardian to restore access.</p>
        </div>
      `,
    });
  }

  async sendDataExportEmail(email: string, displayName: string, exportUrl: string, expiresAt: Date): Promise<boolean> {
    return this.send({
      to: email,
      subject: 'Your Data Export is Ready',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Data Export Ready</h2>
          <p>Dear ${displayName},</p>
          <p>Your data export is ready for download.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${exportUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Download Your Data
            </a>
          </div>
          <p>This link will expire on ${expiresAt.toLocaleDateString()}.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; font-size: 12px;">
            This export contains your personal data as per GDPR Article 20.
          </p>
        </div>
      `,
    });
  }

  async sendAccountDeletionConfirmation(email: string, displayName: string): Promise<boolean> {
    return this.send({
      to: email,
      subject: 'Account Deletion Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Account Deletion Requested</h2>
          <p>Dear ${displayName},</p>
          <p>We have received your request to delete your Ninor account.</p>
          <p>Your account will be deleted within 30 days. During this time, you can cancel the deletion by logging in.</p>
          <p>After deletion, your data will be permanently removed from our systems.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; font-size: 12px;">
            This action is in accordance with GDPR Article 17 (Right to Erasure).
          </p>
        </div>
      `,
    });
  }

  async sendSafetyAlertEmail(email: string, displayName: string, alertType: string, details: string): Promise<boolean> {
    return this.send({
      to: email,
      subject: 'Safety Alert from Ninor',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Safety Alert</h2>
          <p>Dear ${displayName},</p>
          <p>We wanted to inform you about a safety-related event on your account.</p>
          <p><strong>Type:</strong> ${alertType}</p>
          <p>${details}</p>
          <p>If you did not initiate this action or believe your account is compromised, please contact us immediately.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; font-size: 12px;">
            Contact safety team: <a href="mailto:safety@ninor.com">safety@ninor.com</a>
          </p>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
