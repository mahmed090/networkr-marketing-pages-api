import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { GoogleSheetsService } from './google-sheets.service';

@Module({
  controllers: [ContactController],
  providers: [ContactService, GoogleSheetsService],
})
export class ContactModule {}
