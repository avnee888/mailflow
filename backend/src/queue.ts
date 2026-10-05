import { Queue } from 'bullmq';

import Redis from 'ioredis';

const redisOptions = process.env.REDIS_URL ? process.env.REDIS_URL : {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};
const connection = new Redis(redisOptions as any, { maxRetriesPerRequest: null });

export const emailQueue = new Queue('emailQueue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 24 * 3600 },
    removeOnFail: { age: 24 * 3600 },
  }
});
