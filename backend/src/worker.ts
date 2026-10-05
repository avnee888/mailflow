import { Worker, DelayedError } from 'bullmq';
import nodemailer from 'nodemailer';
import Redis from 'ioredis';
import { prisma } from './db';
import { indexEmail } from './elastic';
import { sendSlackNotification } from './slack';

const redisOptions = process.env.REDIS_URL ? process.env.REDIS_URL : {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};
const redis = new Redis(redisOptions as any, { maxRetriesPerRequest: null });

const MAX_EMAILS_PER_HOUR = parseInt(process.env.MAX_EMAILS_PER_HOUR || '200');
const MIN_DELAY_MS = parseInt(process.env.MIN_DELAY_MS || '2000');
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const worker = new Worker('emailQueue', async (job) => {
  const { id, recipient, subject, body, sender, tenantId, hourlyLimit } = job.data;
  
  const record = await prisma.emailJob.findUnique({ where: { id } });
  if (record?.status === 'SENT') return; // Idempotency check

  const hourKey = new Date().toISOString().substring(0, 13);
  const rateKey = `rate:${sender}:${hourKey}`;
  
  const pipeline = redis.multi();
  pipeline.incr(rateKey);
  pipeline.expire(rateKey, 3600, 'NX');
  const results = await pipeline.exec();
  const count = (results?.[0]?.[1] as number) || 1;

  const limit = hourlyLimit || MAX_EMAILS_PER_HOUR;
  
  if (count > limit) {
    const nextHour = new Date();
    nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
    const delay = nextHour.getTime() - Date.now();
    
    console.log(`Rate limit hit for ${sender}. Delaying job ${job.id} by ${delay}ms`);
    
    if (count === limit + 1) {
      await sendSlackNotification(tenantId, `🚨 Rate limit exceeded for sender ${sender}. Rescheduling ${job.id} to next hour.`);
    }
    
    await job.moveToDelayed(Date.now() + delay, job.token!);
    throw new DelayedError();
  }

  try {
    await transporter.sendMail({
      from: sender,
      to: recipient,
      subject,
      text: body,
    });
    
    await prisma.emailJob.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() }
    });
    await indexEmail({ id, subject, body, recipient, sender, status: 'SENT', scheduledAt: job.data.scheduledAt });
  } catch (error) {
    await prisma.emailJob.update({
      where: { id },
      data: { status: 'FAILED' }
    });
    await indexEmail({ id, subject, body, recipient, sender, status: 'FAILED', scheduledAt: job.data.scheduledAt });
    throw error;
  }
}, { 
  connection: redis,
  concurrency: CONCURRENCY,
  limiter: { max: 1, duration: MIN_DELAY_MS }
});
