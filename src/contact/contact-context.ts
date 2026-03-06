/** Request context passed when sending contact (e.g. client IP for sheets/logging) */
export interface ContactContext {
  /** Client IP (from request or x-forwarded-for) */
  clientIp?: string;
}
