import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, sheets_v4 } from 'googleapis';
import { ContactDto } from './dto/contact.dto';

/** Context for appending a contact row (IP and geo) */
export interface AppendContactContext {
  clientIp?: string;
  city?: string;
  country?: string;
  timezone?: string;
}

@Injectable()
export class GoogleSheetsService {
  private readonly spreadsheetId: string | null;
  private readonly sheetName: string;
  private initPromise: Promise<sheets_v4.Sheets> | null = null;

  constructor(private readonly config: ConfigService) {
    this.spreadsheetId = this.config.get<string>('GOOGLE_SHEETS_SPREADSHEET_ID') ?? null;
    this.sheetName = this.config.get<string>('GOOGLE_SHEETS_SHEET_NAME') ?? 'Contact Form';
  }

  /** True if spreadsheet ID and credentials are configured */
  isConfigured(): boolean {
    return !!this.spreadsheetId && !!this.getCredentials();
  }

  private getCredentials(): string | object | null {
    const path = this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    if (path) return path;
    const json = this.config.get<string>('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!json) return null;
    try {
      return JSON.parse(json) as object;
    } catch {
      return null;
    }
  }

  private async getSheetsClient(): Promise<sheets_v4.Sheets> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.initClient();
    return this.initPromise;
  }

  private async initClient(): Promise<sheets_v4.Sheets> {
    const credentials = this.getCredentials();
    if (!credentials) {
      throw new Error('Google Sheets credentials not configured.');
    }
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      ...(typeof credentials === 'string'
        ? { keyFile: credentials }
        : { credentials }),
    });
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client as any });
  }

  /**
   * Append one contact submission as a row.
   * Columns: Date and Time, Name, Email, Phone, Subject, Page Name, IP, City, Country, Timezone
   */
  async appendContact(dto: ContactDto, ctx?: AppendContactContext): Promise<void> {
    if (!this.spreadsheetId || !this.isConfigured()) return;

    const sheets = await this.getSheetsClient();
    const now = new Date();
    const dateTime =
      now.getFullYear() +
      '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getDate()).padStart(2, '0') +
      ' ' +
      String(now.getHours()).padStart(2, '0') +
      ':' +
      String(now.getMinutes()).padStart(2, '0') +
      ':' +
      String(now.getSeconds()).padStart(2, '0');

    const row = [
      dateTime,
      dto.name,
      dto.email,
      dto.phone ?? '',
      dto.subject ?? '',
      dto.tenantId ?? '', // Page name (tenant id from frontend)
      ctx?.clientIp ?? '',
      ctx?.city ?? '',
      ctx?.country ?? '',
      ctx?.timezone ?? '',
    ];

    // Sheet names with spaces must be single-quoted for the API
    const range =
      this.sheetName.includes(' ') || this.sheetName.includes("'")
        ? `'${this.sheetName.replace(/'/g, "''")}'!A:J`
        : `${this.sheetName}!A:J`;

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
  }
}
