import nodemailer from 'nodemailer';
import type { SupportTicket } from '../types';

export interface SupportEmailPayload {
  event: 'ticket_created' | 'support_reply' | 'user_reply' | 'ticket_resolved';
  ticket: SupportTicket;
  messageContent?: string;
  senderName?: string;
  isInternalNote?: boolean;
}

export interface SupportEmailResult {
  success: boolean;
  emailSent: boolean;
  message?: string;
  userEmailSent?: boolean;
  supportInboxEmailSent?: boolean;
  details?: any;
}

/**
 * Creates nodemailer transporter for Zoho Mail SMTP
 */
function createZohoTransporter() {
  const user = process.env.ZOHO_MAIL_USER;
  const pass = process.env.ZOHO_MAIL_PASSWORD;
  const host = process.env.ZOHO_MAIL_HOST || 'smtp.zoho.com';
  const port = Number(process.env.ZOHO_MAIL_PORT || 465);

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates branded bilingual HTML template for La3ib notifications
 */
function generateBilingualEmailHtml(options: {
  headlineEn: string;
  headlineAr: string;
  leadEn: string;
  leadAr: string;
  ticket: SupportTicket;
  messageBody?: string;
  actionTextEn?: string;
  actionTextAr?: string;
}): string {
  const { headlineEn, headlineAr, leadEn, leadAr, ticket, messageBody, actionTextEn, actionTextAr } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(ticket.ticketNumber)} - ${escapeHtml(headlineEn)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #0F172A; }
    .card { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #06135B; padding: 24px 32px; color: #FFFFFF; }
    .logo { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
    .logo span { color: #05BCD1; }
    .badge { display: inline-block; background: rgba(5, 188, 209, 0.15); color: #05BCD1; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; margin-top: 8px; border: 1px solid rgba(5, 188, 209, 0.3); }
    .content { padding: 32px; }
    .headline { font-size: 18px; font-weight: 800; color: #06135B; margin: 0 0 8px 0; }
    .lead { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; }
    .rtl-block { direction: rtl; text-align: right; margin-top: 16px; padding-top: 16px; border-top: 1px dashed #E2E8F0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
    .rtl-headline { font-size: 17px; font-weight: 800; color: #06135B; margin: 0 0 6px 0; }
    .rtl-lead { font-size: 14px; color: #475569; line-height: 1.6; margin: 0; }
    .meta-box { background: #F1F5F9; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label { color: #64748B; font-weight: 600; }
    .meta-value { color: #0F172A; font-weight: 700; }
    .message-box { background: #EEF3F9; border-left: 4px solid #3A60AA; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #1E293B; line-height: 1.6; white-space: pre-wrap; }
    .footer { background: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">La3ib | <span>لاعب</span></div>
      <div class="badge">Ticket #${escapeHtml(ticket.ticketNumber)}</div>
    </div>
    <div class="content">
      <h2 class="headline">${escapeHtml(headlineEn)}</h2>
      <p class="lead">${escapeHtml(leadEn)}</p>

      <div class="meta-box">
        <div class="meta-row">
          <span class="meta-label">Subject / الموضوع:</span>
          <span class="meta-value">${escapeHtml(ticket.subject)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Category / التصنيف:</span>
          <span class="meta-value">${escapeHtml(ticket.category.replace(/_/g, ' '))}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Status / الحالة:</span>
          <span class="meta-value">${escapeHtml((ticket.status || 'open').toUpperCase())}</span>
        </div>
        ${ticket.priority ? `
        <div class="meta-row">
          <span class="meta-label">Priority / الأولوية:</span>
          <span class="meta-value">${escapeHtml(ticket.priority.toUpperCase())}</span>
        </div>` : ''}
      </div>

      ${messageBody ? `
        <div class="message-box">
          ${escapeHtml(messageBody)}
        </div>
      ` : ''}

      <div class="rtl-block">
        <h3 class="rtl-headline">${escapeHtml(headlineAr)}</h3>
        <p class="rtl-lead">${escapeHtml(leadAr)}</p>
      </div>
    </div>
    <div class="footer">
      <p>La3ib Kuwait Sports Community • منصة تنظيم الرياضة في الكويت</p>
      <p>Need urgent assistance? Reply directly to this email or visit La3ib Help & Support.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Handles sending email notifications for support tickets via Zoho Mail
 */
export async function sendSupportEmail(payload: SupportEmailPayload): Promise<SupportEmailResult> {
  const { event, ticket, messageContent, senderName, isInternalNote } = payload;

  if (isInternalNote) {
    return {
      success: true,
      emailSent: false,
      message: 'Internal note skipped from email notification.'
    };
  }

  // Disabled by default for launch (in-app only)
  if (process.env.SUPPORT_EMAIL_ENABLED !== 'true') {
    return {
      success: true,
      emailSent: false,
      message: 'Support email notifications are disabled for launch (SUPPORT_EMAIL_ENABLED=false).'
    };
  }

  const transporter = createZohoTransporter();
  const zohoUser = process.env.ZOHO_MAIL_USER;
  const fromEmail = process.env.ZOHO_MAIL_FROM || zohoUser || 'info@la3ibkw.com';
  const supportInbox = process.env.ZOHO_SUPPORT_INBOX || 'info@la3ibkw.com';

  if (!transporter || !zohoUser) {
    console.info('[Zoho Mail] SMTP credentials not set (ZOHO_MAIL_USER / ZOHO_MAIL_PASSWORD). Email notification logged safely:', {
      event,
      ticketNumber: ticket.ticketNumber,
      recipientUser: ticket.userEmail,
      supportInbox
    });

    return {
      success: true,
      emailSent: false,
      message: 'Zoho Mail credentials not configured on server. Email was logged and simulated safely.',
      details: {
        event,
        ticketNumber: ticket.ticketNumber,
        userEmail: ticket.userEmail,
        supportInbox
      }
    };
  }

  let userEmailSent = false;
  let supportInboxEmailSent = false;

  try {
    switch (event) {
      case 'ticket_created': {
        // 1. User confirmation email
        const userSubject = `[La3ib Support] Ticket Received: ${ticket.ticketNumber} - ${ticket.subject}`;
        const userHtml = generateBilingualEmailHtml({
          headlineEn: 'We have received your support request',
          headlineAr: 'تم استلام طلب المساعدة الخاص بك بنجاح',
          leadEn: `Hello ${ticket.userName || 'Athlete'}, thank you for contacting La3ib Support. Our team has received your ticket and is reviewing your request. Our support team will respond as soon as possible.`,
          leadAr: `مرحباً ${ticket.userName || 'يا كابتن'}، شكراً لتواصلك مع دعم منصة لعّيب. لقد استلم فريقنا تذكرتك وجارٍ مراجعتها بعناية. سيقوم فريق الدعم بالرد في أقرب وقت ممكن.`,
          ticket,
          messageBody: ticket.description
        });

        await transporter.sendMail({
          from: `"La3ib Support | لاعب" <${fromEmail}>`,
          to: ticket.userEmail,
          subject: userSubject,
          html: userHtml
        });
        userEmailSent = true;

        // 2. Alert to Support Inbox
        const adminSubject = `[New Support Ticket] ${ticket.ticketNumber} - ${ticket.subject}`;
        const adminHtml = generateBilingualEmailHtml({
          headlineEn: `New Ticket Submitted by ${ticket.userName} (${ticket.userEmail})`,
          headlineAr: `تذكرة دعم جديدة من اللاعب ${ticket.userName}`,
          leadEn: `A new ticket has been filed via ${ticket.origin === 'community_guidelines' ? 'Community Guidelines Violation Report' : 'Help & Support'}.`,
          leadAr: `تم تقديم تذكرة جديدة عبر ${ticket.origin === 'community_guidelines' ? 'بلاغ مخالفات إرشادات المجتمع' : 'المساعدة والدعم'}.`,
          ticket,
          messageBody: ticket.description
        });

        await transporter.sendMail({
          from: `"La3ib System" <${fromEmail}>`,
          to: supportInbox,
          replyTo: ticket.userEmail,
          subject: adminSubject,
          html: adminHtml
        });
        supportInboxEmailSent = true;
        break;
      }

      case 'support_reply': {
        // Staff replied -> notify user
        const userSubject = `[La3ib Support] Reply on Ticket ${ticket.ticketNumber}: ${ticket.subject}`;
        const userHtml = generateBilingualEmailHtml({
          headlineEn: 'Support Staff has replied to your ticket',
          headlineAr: 'قام فريق الدعم بالرد على تذكرتك',
          leadEn: `Hello ${ticket.userName || 'Athlete'}, our support team has posted an update regarding ticket #${ticket.ticketNumber}.`,
          leadAr: `مرحباً ${ticket.userName || 'يا كابتن'}، أرسل فريق الدعم رداً بخصوص التذكرة #${ticket.ticketNumber}.`,
          ticket,
          messageBody: messageContent || 'Please open La3ib to review the full reply.'
        });

        await transporter.sendMail({
          from: `"La3ib Support | لاعب" <${fromEmail}>`,
          to: ticket.userEmail,
          subject: userSubject,
          html: userHtml
        });
        userEmailSent = true;
        break;
      }

      case 'user_reply': {
        // User replied -> notify support inbox
        const adminSubject = `[User Reply] ${ticket.ticketNumber} - ${ticket.subject}`;
        const adminHtml = generateBilingualEmailHtml({
          headlineEn: `User Reply on Ticket ${ticket.ticketNumber}`,
          headlineAr: `رد جديد من المستخدم على التذكرة #${ticket.ticketNumber}`,
          leadEn: `${senderName || ticket.userName} (${ticket.userEmail}) has replied to their support ticket.`,
          leadAr: `قام ${senderName || ticket.userName} بإضافة رد جديد على التذكرة.`,
          ticket,
          messageBody: messageContent || 'New user reply in ticket.'
        });

        await transporter.sendMail({
          from: `"La3ib Support Notifications" <${fromEmail}>`,
          to: supportInbox,
          replyTo: ticket.userEmail,
          subject: adminSubject,
          html: adminHtml
        });
        supportInboxEmailSent = true;
        break;
      }

      case 'ticket_resolved': {
        // Resolved -> notify user
        const userSubject = `[La3ib Support] Ticket Resolved: ${ticket.ticketNumber}`;
        const userHtml = generateBilingualEmailHtml({
          headlineEn: 'Your support ticket has been resolved',
          headlineAr: 'تم تحديد تذكرتك كـ محلولة',
          leadEn: `Hello ${ticket.userName || 'Athlete'}, ticket #${ticket.ticketNumber} has been marked as Resolved. If your issue is not fully addressed, you can reopen it directly in the app or reply to this email.`,
          leadAr: `مرحباً ${ticket.userName || 'يا كابتن'}، تم حل تذكرتك #${ticket.ticketNumber}. إذا كنت لا تزال بحاجة للمساعدة، يمكنك إعادة فتح التذكرة من داخل التطبيق أو الرد مباشرة على هذه الرسالة.`,
          ticket
        });

        await transporter.sendMail({
          from: `"La3ib Support | لاعب" <${fromEmail}>`,
          to: ticket.userEmail,
          subject: userSubject,
          html: userHtml
        });
        userEmailSent = true;
        break;
      }
    }

    return {
      success: true,
      emailSent: userEmailSent || supportInboxEmailSent,
      userEmailSent,
      supportInboxEmailSent
    };
  } catch (err: any) {
    console.error('[Zoho Mail] Failed to dispatch email via SMTP:', err);
    return {
      success: false,
      emailSent: false,
      message: err?.message || 'SMTP dispatch failed'
    };
  }
}
