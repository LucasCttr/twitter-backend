import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueDebugService implements OnModuleInit, OnModuleDestroy {
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(@InjectQueue('like-notify') private readonly queue: Queue) {}

  async onModuleInit() {
    console.log('QueueDebugService: inicializando monitor de cola like-notify');

    // Log initial job counts
    try {
      const counts = await this.queue.getJobCounts();
      console.log('QueueDebugService: job counts', counts);
    } catch (err) {
      console.error('QueueDebugService: error al obtener job counts', err);
    }

    // Global event listeners (works when client connected)
    try {
      this.queue.on('waiting', (jobId: any) => {
        console.log('[like-notify] waiting jobId=', jobId);
      });
      this.queue.on('active', (job: any) => {
        console.log('[like-notify] active job=', job && job.id);
      });
      this.queue.on('completed', (job: any, result: any) => {
        console.log('[like-notify] completed job=', job && job.id, 'result=', result);
      });
      this.queue.on('failed', (job: any, err: any) => {
        console.log('[like-notify] failed job=', job && job.id, 'err=', err && err.message);
      });
    } catch (err) {
      console.error('QueueDebugService: error al registrar listeners', err);
    }

    // Poll counts periodically
    this.interval = setInterval(async () => {
      try {
        const counts = await this.queue.getJobCounts();
        console.log('QueueDebugService: periodic job counts', counts);
      } catch (err) {
        console.error('QueueDebugService: periodic error', err);
      }
    }, 5000);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval as unknown as number);
      this.interval = null;
    }
  }
}
