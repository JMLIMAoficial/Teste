import { Module } from '@nestjs/common';
import { EmailQueueService } from './email-queue.service';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService, EmailQueueService],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
