import { Resend } from "resend";
import { logger } from "./logger";

// Email service configuration - supports multiple providers
interface EmailConfig {
  provider: "resend" | "console";
  apiKey?: string;
}

interface TeamInviteParams {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteLink: string;
}

interface CredentialNotificationParams {
  to: string;
  recipientName: string;
  credentialType: string;
  issuerName: string;
  viewLink: string;
}

class EmailService {
  private provider: "resend" | "console";
  private resend?: Resend;

  constructor(config: EmailConfig) {
    this.provider = config.provider;

    if (config.provider === "resend" && config.apiKey) {
      this.resend = new Resend(config.apiKey);
    }
  }

  async sendTeamInvite(params: TeamInviteParams): Promise<void> {
    const subject = `You've been invited to join ${params.organizationName} on CredVerse`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 24px; font-weight: bold; color: #3B82F6; }
          .content { background: #f8fafc; padding: 30px; border-radius: 12px; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
          .role-badge { display: inline-block; background: #E0E7FF; color: #4338CA; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎓 CredVerse</div>
          </div>
          <div class="content">
            <h2>You're Invited!</h2>
            <p><strong>${params.inviterName}</strong> has invited you to join <strong>${params.organizationName}</strong> as a <span class="role-badge">${params.role}</span>.</p>
            <p>CredVerse is a blockchain-powered credential platform that helps organizations issue, manage, and verify digital credentials.</p>
            <center>
              <a href="${params.inviteLink}" class="button">Accept Invitation</a>
            </center>
            <p style="font-size: 14px; color: #666;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2025 CredVerse. Secure Credentials, Trusted Everywhere.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send(params.to, subject, html);
  }

  async sendCredentialNotification(
    params: CredentialNotificationParams,
  ): Promise<void> {
    const subject = `Your new credential from ${params.issuerName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 24px; font-weight: bold; color: #3B82F6; }
          .content { background: #f8fafc; padding: 30px; border-radius: 12px; }
          .credential-card { background: white; border: 2px solid #3B82F6; border-radius: 12px; padding: 24px; margin: 20px 0; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎓 CredVerse</div>
          </div>
          <div class="content">
            <h2>Congratulations, ${params.recipientName}! 🎉</h2>
            <p>A new credential has been issued to you.</p>
            <div class="credential-card">
              <h3 style="margin: 0 0 8px 0; color: #1E40AF;">${params.credentialType}</h3>
              <p style="margin: 0; color: #666;">Issued by ${params.issuerName}</p>
            </div>
            <center>
              <a href="${params.viewLink}" class="button">View Credential</a>
            </center>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">This credential is securely stored on the blockchain and can be verified by anyone using the link above.</p>
          </div>
          <div class="footer">
            <p>© 2025 CredVerse. Secure Credentials, Trusted Everywhere.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send(params.to, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      if (this.provider === "resend" && this.resend) {
        const { data, error } = await this.resend.emails.send({
          from: process.env.EMAIL_FROM || "CredVerse <noreply@credverse.app>",
          to,
          subject,
          html,
        });

        if (error) {
          logger.error({ err: error }, "[Email] Resend API error");
          return;
        }

        logger.info(
          { emailId: data?.id, recipient: to },
          "[Email] Sent successfully via Resend",
        );
      } else {
        // Logger fallback for development
        logger.info(
          {
            type: "email_mock",
            to,
            subject,
            preview: "Check console for HTML content",
          },
          "[Email] Mock sent (Console Mode)",
        );

        if (process.env.NODE_ENV === "development") {
          console.log("=".repeat(60));
          console.log("📧 EMAIL PREVIEW");
          console.log(`To: ${to}`);
          console.log(`Subject: ${subject}`);
          console.log("=".repeat(60));
        }
      }
    } catch (error) {
      logger.error({ err: error }, "[Email] Failed to send email");
    }
  }

  async sendBulkIssuanceReport(
    to: string,
    jobId: string,
    total: number,
    success: number,
    failed: number,
  ): Promise<void> {
    const subject = `Bulk Issuance Completed: ${success}/${total} Success`;
    const html = `
            <div style="font-family: sans-serif;">
                <h3>Bulk Issuance Report</h3>
                <p>Your bulk issuance job <code>${jobId}</code> has completed.</p>
                <ul>
                    <li>Total: <strong>${total}</strong></li>
                    <li>Success: <strong style="color: green;">${success}</strong></li>
                    <li>Failed: <strong style="color: red;">${failed}</strong></li>
                </ul>
                <p>Login to your dashboard to view full details.</p>
            </div>
        `;
    await this.send(to, subject, html);
  }
}

// Initialize email service
export const emailService = new EmailService({
  provider: process.env.RESEND_API_KEY ? "resend" : "console",
  apiKey: process.env.RESEND_API_KEY,
});
