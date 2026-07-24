import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { EmailService, type EmailJob } from './email.service';

function parseRedisConnection(url: string): ConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    maxRetriesPerRequest: null,
  };
}

@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private connection: ConnectionOptions | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  onModuleInit() {
    const url = this.config.get('REDIS_URL');
    if (!url) {
      this.logger.warn('BullMQ email queue disabled (no REDIS_URL)');
      return;
    }

    this.connection = parseRedisConnection(url);
    this.queue = new Queue('notifications.email', { connection: this.connection });

    this.worker = new Worker(
      'notifications.email',
      async (job) => {
        await this.email.send(job.data as EmailJob);
      },
      { connection: this.connection },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Email job failed: ${job?.id} — ${err.message}`);
    });

    this.logger.log('Email queue worker started');
  }

  async enqueue(job: EmailJob, jobId?: string) {
    if (!this.queue) {
      await this.email.send(job);
      return;
    }

    await this.queue.add('send', job, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
