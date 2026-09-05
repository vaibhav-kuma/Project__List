<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - <?php echo e(config('app.name')); ?></title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #e74c3c; padding-bottom: 20px; margin-bottom: 30px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .section { margin: 30px 0; }
        .section h2 { color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .section h3 { color: #34495e; margin-top: 20px; }
        .highlight { background: #e8f4fd; padding: 10px; border-left: 4px solid #3498db; }
        .legal-notice { background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <h1><?php echo e(config('app.name')); ?></h1>
        <h2>Terms of Service</h2>
        <p><strong>Last Updated: <?php echo e(date('F j, Y')); ?></strong></p>
    </div>

    <div class="warning">
        <strong>⚠️ IMPORTANT LEGAL NOTICE:</strong> This service is strictly for authorized security testing only. Unauthorized scanning, reconnaissance, or security testing is illegal and violates these terms.
    </div>

    <div class="section">
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing and using <?php echo e(config('app.name')); ?> ("the Service"), you agree to be bound by these Terms of Service ("Terms"), our Privacy Policy, and our Acceptable Use Policy. If you do not agree to these terms, you may not use the Service.</p>
        
        <div class="highlight">
            <strong>CRITICAL:</strong> Use of this service constitutes your agreement that you have proper legal authorization for all security testing activities.
        </div>
    </div>

    <div class="section">
        <h2>2. Authorized Use Only</h2>
        <h3>2.1. Legal Authorization Required</h3>
        <p>You MUST have explicit, written authorization from the target organization before conducting any security testing, including but not limited to:</p>
        <ul>
            <li>Network scanning and reconnaissance</li>
            <li>Vulnerability assessment</li>
            <li>Penetration testing</li>
            <li>Domain monitoring</li>
            <li>OSINT collection</li>
        </ul>

        <h3>2.2. Prohibited Activities</h3>
        <p>Strictly prohibited activities include:</p>
        <ul>
            <li>Unauthorized scanning of any system or network</li>
            <li>Testing systems without explicit permission</li>
            <li>Denial of Service (DoS/DDoS) attacks</li>
            <li>Social engineering attacks</li>
            <li>Exploitation of vulnerabilities without authorization</li>
            <li>Theft, modification, or destruction of data</li>
            <li>Any violation of applicable laws</li>
        </ul>

        <div class="highlight">
            <strong>LEGAL CONSEQUENCES:</strong> Violation of this section may result in immediate account termination, legal action, and reporting to law enforcement authorities.
        </div>
    </div>

    <div class="section">
        <h2>3. User Responsibilities</h2>
        <h3>3.1. Identity Verification</h3>
        <p>All users must complete identity verification including:</p>
        <ul>
            <li>Government-issued ID verification</li>
            <li>Professional background verification</li>
            <li>Corporate email verification (for business accounts)</li>
        </ul>

        <h3>3.2. Authorization Documentation</h3>
        <p>You must maintain and provide upon request:</p>
        <ul>
            <li>Written authorization from target organizations</li>
            <li>Scope of testing documentation</li>
            <li>Rules of engagement</li>
            <li>Liability waivers</li>
        </ul>

        <h3>3.3. Compliance Obligations</h3>
        <p>You are responsible for compliance with:</p>
        <ul>
            <li>All applicable laws and regulations</li>
            <li>Industry-specific compliance requirements</li>
            <li>Target organization's policies</li>
            <li>These Terms of Service</li>
        </ul>
    </div>

    <div class="section">
        <h2>4. Domain Monitoring & OSINT</h2>
        <h3>4.1. Authorized Targets Only</h3>
        <p>Domain monitoring and OSINT collection may only be performed on:</p>
        <ul>
            <li>Domains you own or have explicit authorization to monitor</li>
            <li>Domains specified in approved authorization documents</li>
            <li>Publicly available information within legal bounds</li>
        </ul>

        <h3>4.2. Domain Owner Rights</h3>
        <p>Domain owners have the right to:</p>
        <ul>
            <li>Opt-out of monitoring at any time</li>
            <li>Request removal of their data</li>
            <li>Receive notifications about monitoring activities</li>
            <li>Report unauthorized monitoring</li>
        </ul>

        <h3>4.3. Data Collection Limits</h3>
        <p>OSINT collection is limited to:</p>
        <ul>
            <li>Publicly available information only</li>
            <li>Information relevant to security assessment</li>
            <li>Data collected within legal boundaries</li>
            <li>Information specified in authorization scope</li>
        </ul>
    </div>

    <div class="section">
        <h2>5. Evidence & Data Handling</h2>
        <h3>5.1. Evidence Integrity</h3>
        <p>All evidence must be:</p>
        <ul>
            <li>Collected with proper authorization</li>
            <li>Preserved with cryptographic integrity protection</li>
            <li>Stored securely with access controls</li>
            <li>Maintained with complete chain of custody</li>
        </ul>

        <h3>5.2. Data Retention</h3>
        <p>Data retention requirements:</p>
        <ul>
            <li>Evidence retained for minimum 7 years</li>
            <li>Audit logs retained for 7 years</li>
            <li>Authorization documents retained for 7 years</li>
            <li>Compliance with legal retention requirements</li>
        </ul>

        <h3>5.3. Data Protection</h3>
        <p>All sensitive data must be:</p>
        <ul>
            <li>Encrypted at rest and in transit</li>
            <li>Access controlled by role-based permissions</li>
            <li>Protected against unauthorized access</li>
            <li>Handled in compliance with privacy laws</li>
        </ul>
    </div>

    <div class="section">
        <h2>6. Abuse Prevention & Detection</h2>
        <h3>6.1. Monitoring</h3>
        <p>We actively monitor for:</p>
        <ul>
            <li>Unauthorized scanning activities</li>
            <li>Abuse of the platform capabilities</li>
            <li>Suspicious behavioral patterns</li>
            <li>Violations of these Terms</li>
        </ul>

        <h3>6.2. Reporting</h3>
        <p>Suspicious activities will be:</p>
        <ul>
            <li>Investigated by our security team</li>
            <li>Reported to appropriate authorities if illegal</li>
            <li>Documented for legal purposes</li>
            <li>Result in account suspension or termination</li>
        </ul>

        <h3>6.3. Cooperation with Authorities</h3>
        <p>We cooperate with:</p>
        <ul>
            <li>Law enforcement investigations</li>
            <li>Regulatory inquiries</li>
            <li>Court orders and subpoenas</li>
            <li>Victim organizations</li>
        </ul>
    </div>

    <div class="section">
        <h2>7. Liability & Indemnification</h2>
        <h3>7.1. User Liability</h3>
        <p>You are solely responsible for:</p>
        <ul>
            <li>Ensuring proper authorization for all activities</li>
            <li>Compliance with all applicable laws</li>
            <li>Any damages resulting from your activities</li>
            <li>Maintaining proper documentation</li>
        </ul>

        <h3>7.2. Indemnification</h3>
        <p>You agree to indemnify and hold harmless <?php echo e(config('app.name')); ?> from:</p>
        <ul>
            <li>Any claims arising from your unauthorized activities</li>
            <li>Legal costs and damages</li>
            <li>Third-party claims related to your use of the service</li>
            <li>Violations of these Terms or applicable laws</li>
        </ul>

        <h3>7.3. Service Limitations</h3>
        <p><?php echo e(config('app.name')); ?> is not liable for:</p>
        <ul>
            <li>User actions beyond our control</li>
            <li>Unauthorized use of the platform</li>
            <li>Third-party service interruptions</li>
            <li>Consequences of user violations</li>
        </ul>
    </div>

    <div class="section">
        <h2>8. Account Suspension & Termination</h2>
        <h3>8.1. Suspension</h3>
        <p>We may suspend accounts for:</p>
        <ul>
            <li>Suspicious activity patterns</li>
            <li>Violation of these Terms</li>
            <li>Abuse reports from third parties</li>
            <li>Failure to provide required documentation</li>
        </ul>

        <h3>8.2. Termination</h3>
        <p>We may terminate accounts for:</p>
        <ul>
            <li>Illegal activities</li>
            <li>Repeated violations</li>
            <li>Unauthorized security testing</li>
            <li>Fraud or misrepresentation</li>
        </ul>

        <h3>8.3. Data Preservation</h3>
        <p>Upon termination:</p>
        <ul>
            <li>Evidence and audit logs will be preserved</li>
            <li>Data may be provided to authorities</li>
            <li>Legal hold procedures will be followed</li>
            <li>Retention requirements will be maintained</li>
        </ul>
    </div>

    <div class="section">
        <h2>9. Legal Compliance</h2>
        <h3>9.1. Applicable Laws</h3>
        <p>You must comply with:</p>
        <ul>
            <li>Computer Fraud and Abuse Act (CFAA)</li>
            <li>State computer crime laws</li>
            <li>International cybercrime laws</li>
            <li>Industry-specific regulations</li>
        </ul>

        <h3>9.2. International Use</h3>
        <p>International users must comply with:</p>
        <ul>
            <li>Local cybercrime laws</li>
            <li>Data protection regulations</li>
            <li>Export control laws</li>
            <li>International agreements</li>
        </ul>

        <h3>9.3. Regulatory Compliance</h3>
        <p>We maintain compliance with:</p>
        <ul>
            <li>SOC 2 Type II requirements</li>
            <li>GDPR data protection standards</li>
            <li>PCI-DSS security standards</li>
            <li>ISO 27001 security framework</li>
        </ul>
    </div>

    <div class="section">
        <h2>10. Privacy & Data Protection</h2>
        <h3>10.1. Data Collection</h3>
        <p>We collect:</p>
        <ul>
            <li>Identity verification data</li>
            <li>Authorization documentation</li>
            <li>Activity logs for audit purposes</li>
            <li>Technical usage data</li>
        </ul>

        <h3>10.2. Data Usage</h3>
        <p>Data is used for:</p>
        <ul>
            <li>Identity verification and compliance</li>
            <li>Abuse detection and prevention</li>
            <li>Legal compliance and reporting</li>
            <li>Service improvement and security</li>
        </ul>

        <h3>10.3. Data Rights</h3>
        <p>You have rights to:</p>
        <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Request data deletion (where legally permitted)</li>
            <li>Opt-out of marketing communications</li>
        </ul>
    </div>

    <div class="section">
        <h2>11. Intellectual Property</h2>
        <h3>11.1. Service Ownership</h3>
        <p>SecureScout Pro retains all rights to:</p>
        <ul>
            <li>The platform and its technology</li>
            <li>Algorithms and methodologies</li>
            <li>Documentation and training materials</li>
            <li>Brand names and trademarks</li>
        </ul>

        <h3>11.2. User Content</h3>
        <p>You retain rights to:</p>
        <ul>
            <li>Your authorization documents</li>
            <li>Your findings and reports</li>
            <li>Your methodology documentation</li>
            <li>Your client relationships</li>
        </ul>

        <h3>11.3. License Grant</h3>
        <p>You grant us license to:</p>
        <ul>
            <li>Store and process your data</li>
            <li>Use anonymized data for improvement</li>
            <li>Comply with legal obligations</li>
            <li>Provide the service to you</li>
        </ul>
    </div>

    <div class="section">
        <h2>12. Dispute Resolution</h2>
        <h3>12.1. Governing Law</h3>
        <p>These Terms are governed by:</p>
        <ul>
            <li>Laws of the United States</li>
            <li>State laws where applicable</li>
            <li>International agreements where relevant</li>
            <li>Industry-specific regulations</li>
        </ul>

        <h3>12.2. Jurisdiction</h3>
        <p>Legal disputes will be handled in:</p>
        <ul>
            <li>Federal courts for federal matters</li>
            <li>State courts for state matters</li>
            <li>Arbitration for certain disputes</li>
            <li>International tribunals where required</li>
        </ul>

        <h3>12.3. Enforcement</h3>
        <p>We may seek:</p>
        <ul>
            <li>Injunctive relief for violations</li>
            <li>Monetary damages for losses</li>
            <li>Attorney fees and costs</li>
            <li>Criminal prosecution where applicable</li>
        </ul>
    </div>

    <div class="section">
        <h2>13. Modifications to Terms</h2>
        <h3>13.1. Changes</h3>
        <p>We may modify these Terms for:</p>
        <ul>
            <li>Legal and regulatory changes</li>
            <li>Service improvements</li>
            <li>Security enhancements</li>
            <li>Business requirements</li>
        </ul>

        <h3>13.2. Notice</h3>
        <p>Changes will be communicated via:</p>
        <ul>
            <li>Email notifications</li>
            <li>Platform announcements</li>
            <li>Website updates</li>
            <li>Direct notifications</li>
        </ul>

        <h3>13.3. Acceptance</h3>
        <p>Continued use constitutes acceptance of:</p>
        <ul>
            <li>Modified Terms</li>
            <li>New requirements</li>
            <li>Updated policies</li>
            <li>Additional obligations</li>
        </ul>
    </div>

    <div class="section">
        <h2>14. Contact Information</h2>
        <h3>14.1. General Inquiries</h3>
        <p><strong>Email:</strong> legal@securescout.com</p>
        <p><strong>Phone:</strong> +1-555-SECURE-1</p>
        
        <h3>14.2. Abuse Reports</h3>
        <p><strong>Email:</strong> abuse@securescout.com</p>
        <p><strong>Response Time:</strong> Within 24 hours</p>
        
        <h3>14.3. Privacy Inquiries</h3>
        <p><strong>Email:</strong> privacy@securescout.com</p>
        <p><strong>Response Time:</strong> Within 30 days</p>
        
        <h3>14.4. Legal Notices</h3>
        <p><strong>Address:</strong> SecureScout Pro Legal Department<br>
        123 Security Boulevard<br>
        San Francisco, CA 94105<br>
        United States</p>
    </div>

    <div class="legal-notice">
        <h3>⚖️ Legal Disclaimer</h3>
        <p>This document is for informational purposes only and does not constitute legal advice. Users should consult with legal counsel to ensure compliance with all applicable laws and regulations. SecureScout Pro is not responsible for user actions or compliance with legal requirements.</p>
        
        <p><strong>By using <?php echo e(config('app.name')); ?>, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</strong></p>
    </div>

    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p>&copy; <?php echo e(date('Y')); ?> <?php echo e(config('app.name')); ?>. All rights reserved.</p>
    </div>

    <?php if(auth()->guard()->check()): ?>
        <?php if(!auth()->user()->terms_accepted_at): ?>
            <div class="section" style="text-align: center;">
                <form method="POST" action="<?php echo e(route('legal.terms.accept')); ?>">
                    <?php echo csrf_field(); ?>
                    <button type="submit" style="background:#1e40af;color:#fff;border:none;padding:12px 20px;border-radius:6px;cursor:pointer;">
                        I Accept the Terms of Service
                    </button>
                </form>
                <p style="margin-top:10px;color:#6b7280;font-size:14px;">
                    Your acceptance will be recorded with timestamp and IP address.
                </p>
            </div>
        <?php else: ?>
            <div class="section highlight" style="text-align: center;">
                <p>You accepted these Terms on <?php echo e(auth()->user()->terms_accepted_at->timezone(config('app.timezone'))->format('F j, Y, g:i A')); ?>.</p>
            </div>
        <?php endif; ?>
    <?php endif; ?>
</body>
</html>
<?php /**PATH F:\Resume\ninor_project\New\resources\views/legal/terms.blade.php ENDPATH**/ ?>