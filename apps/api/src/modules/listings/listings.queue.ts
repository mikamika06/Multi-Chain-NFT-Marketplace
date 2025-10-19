import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ListingsQueueService {
  private readonly logger = new Logger(ListingsQueueService.name);

  constructor(@InjectQueue('listings') private readonly queue: Queue) {}

  async scheduleActivation(listingId: string, runAt: Date): Promise<void> {
    const delay = runAt.getTime() - Date.now();
    if (delay <= 0) {
      return;
    }
    await this.removeJob(`activate:${listingId}`);
    await this.queue.add(
      'activate-listing',
      { listingId },
      {
        jobId: `activate:${listingId}`,
        delay,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  async scheduleSettlement(listingId: string, runAt: Date): Promise<void> {
    const delay = Math.max(runAt.getTime() - Date.now(), 0);
    await this.removeJob(`settle:${listingId}`);
    await this.queue.add(
      'settle-auction',
      { listingId },
      {
        jobId: `settle:${listingId}`,
        delay,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  async rescheduleSettlement(listingId: string, runAt: Date): Promise<void> {
    await this.removeJob(`settle:${listingId}`);
    await this.scheduleSettlement(listingId, runAt);
  }

  async scheduleDutchPriceSync(listingId: string, runAt: Date): Promise<void> {
    const delay = Math.max(runAt.getTime() - Date.now(), 0);
    await this.removeJob(`sync:${listingId}`);
    await this.queue.add(
      'sync-dutch-price',
      { listingId },
      {
        jobId: `sync:${listingId}`,
        delay,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  async clearScheduledJobs(listingId: string): Promise<void> {
    try {
      await Promise.all([
        this.removeJob(`activate:${listingId}`),
        this.removeJob(`settle:${listingId}`),
        this.removeJob(`sync:${listingId}`),
      ]);
    } catch (error) {
      this.logger.debug(`No scheduled jobs to clear for listing ${listingId}: ${error}`);
    }
  }

  private async removeJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }
}
