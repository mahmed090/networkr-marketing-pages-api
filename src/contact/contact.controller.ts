import { Body, Controller, Post, Req, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { ContactDto } from './dto/contact.dto';
import { ContactService } from './contact.service';

function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0];
    return first?.trim() || undefined;
  }
  return req.ip ?? req.socket?.remoteAddress;
}

@Controller()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('contact')
  async contact(
    @Body(new ValidationPipe({ whitelist: true })) body: ContactDto,
    @Req() req: Request,
  ) {
    const clientIp = getClientIp(req);
    await this.contactService.sendContactEmail(body, { clientIp });
    return { ok: true };
  }
}
