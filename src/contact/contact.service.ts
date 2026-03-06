import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import * as geoip from 'geoip-lite';
import { ContactDto } from './dto/contact.dto';
import { ContactContext } from './contact-context';
import { GoogleSheetsService } from './google-sheets.service';

@Injectable()
export class ContactService {
  /** Owner email: receives form submissions and is used as sender (must be verified in SendGrid) */
  private readonly ownerEmail: string;
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly googleSheets: GoogleSheetsService,
  ) {
    this.apiKey = this.config.get<string>('SENDGRID_API_KEY') ?? '';
    this.ownerEmail = this.config.get<string>('CONTACT_EMAIL') ?? '';
    if (this.apiKey) {
      sgMail.setApiKey(this.apiKey);
    }
  }

  /**
   * Main handler: always saves to sheet first (so data is never lost), then sends email.
   * If email fails, the row is already in the sheet and we throw so the user is notified.
   */
  async sendContactEmail(
    dto: ContactDto,
    context?: ContactContext,
  ): Promise<void> {
    await this.appendToSheet(dto, context);
    await this.sendEmail(dto);
  }

  /**
   * Append contact to Google Sheet. Never throws — failures are logged only.
   * So even when email fails, the submission is stored.
   */
  private async appendToSheet(
    dto: ContactDto,
    context?: ContactContext,
  ): Promise<void> {
    if (!this.googleSheets.isConfigured()) return;
    const rawIp = context?.clientIp ?? '';
    const ip = normalizeIp(rawIp);
    const geo = ip ? geoip.lookup(ip) : null;
    const isLocal =
      !ip ||
      ip === '127.0.0.1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.');
    try {
      await this.googleSheets.appendContact(dto, {
        clientIp: ip || rawIp || '—',
        city: geo?.city ?? (isLocal ? 'Local' : '—'),
        country: geo?.country ?? (isLocal ? 'Local' : '—'),
        timezone: geo?.timezone ?? (isLocal ? 'Local' : '—'),
      });
    } catch (e) {
      console.error('[Contact] Google Sheets append failed:', e?.message ?? e);
    }
  }

  /**
   * Send contact email via SendGrid. Throws BadRequestException on failure.
   */
  private async sendEmail(dto: ContactDto): Promise<void> {
    if (!this.apiKey) {
      throw new BadRequestException(
        'SendGrid is not configured. Set SENDGRID_API_KEY.',
      );
    }
    if (!this.ownerEmail) {
      throw new BadRequestException(
        'Owner email is not configured. Set CONTACT_EMAIL.',
      );
    }

    const subject = dto.subject?.trim()
      ? `[Contact] ${dto.subject.slice(0, 80)}${dto.subject.length > 80 ? '…' : ''}`
      : 'New contact form submission';
    const lines = [
      `Name: ${dto.name}`,
      `Email: ${dto.email}`,
      dto.phone ? `Phone: ${dto.phone}` : null,
      dto.tenantId ? `Tenant: ${dto.tenantId}` : null,
      dto.subject ? `\nMessage:\n${dto.subject}` : null,
    ].filter(Boolean);
    const text = lines.join('\n');
    const html = [
      '<p><strong>Name:</strong> ' + escapeHtml(dto.name) + '</p>',
      '<p><strong>Email:</strong> ' + escapeHtml(dto.email) + '</p>',
      dto.phone
        ? '<p><strong>Phone:</strong> ' + escapeHtml(dto.phone) + '</p>'
        : '',
      dto.tenantId
        ? '<p><strong>Tenant:</strong> ' + escapeHtml(dto.tenantId) + '</p>'
        : '',
      dto.subject
        ? '<p><strong>Message:</strong></p><pre>' +
          escapeHtml(dto.subject) +
          '</pre>'
        : '',
    ].join('');

    try {
      await sgMail.send({
        to: this.ownerEmail,
        from: { email: this.ownerEmail, name: 'Networkr Contact' },
        replyTo: dto.email,
        subject,
        text,
        html: `<div style="font-family: sans-serif;">${html}</div>`,
      });
    } catch (err: unknown) {
      const body =
        err && typeof err === 'object' && 'response' in err
          ? (
              err as {
                response?: { body?: { errors?: Array<{ message?: string }> } };
              }
            ).response?.body
          : null;
      const errors = body?.errors;
      const firstMessage = Array.isArray(errors) ? errors[0]?.message : null;
      const isUnverifiedSender =
        typeof firstMessage === 'string' &&
        /verified.*sender|sender identity/i.test(firstMessage);
      if (isUnverifiedSender) {
        throw new BadRequestException(
          `Sender email (${this.ownerEmail}) is not verified in SendGrid. ` +
            'Go to SendGrid → Settings → Sender Authentication and verify this address: https://sendgrid.com/docs/for-developers/sending-email/sender-identity/',
        );
      }
      throw new BadRequestException(
        typeof firstMessage === 'string'
          ? firstMessage
          : 'Failed to send email',
      );
    }
  }
}

/** Normalize IP for display/storage: ::1 and ::ffff:127.0.0.1 → 127.0.0.1 */
function normalizeIp(ip: string): string {
  if (!ip || !ip.trim()) return '';
  const s = ip.trim();
  if (s === '::1' || s === '::ffff:127.0.0.1') return '127.0.0.1';
  if (s.toLowerCase() === '::1') return '127.0.0.1';
  return s;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
