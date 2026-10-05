import { Worker, DelayedError } from 'bullmq';
import nodemailer from 'nodemailer';
import Redis from 'ioredis';
import { prisma } from './db';
import { indexEmail } from './elastic';
import { sendSlackNotification } from './slack';

const redis = new Redis({

  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

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
  
  const hourKey = new Date().toISOString().substring(0, 13);
  const rateKey = `rate:${sender}:${hourKey}`;
  
  const pipeline = redis.multi();
  pipeline.incr(rateKey);
  pipeline.expire(rateKey, 3600, 'NX');
  const results = await pipeline.exec();
  const count = results ? (results[0][1] as number) : 1;

  const limit = hourlyLimit || MAX_EMAILS_PER_HOUR;
  
  if (count > limit) {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    const jitter = Math.floor(Math.random() * 60000);
    const delay = nextHour.getTime() - Date.now() + jitter;
    
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
      data: { status: 'SENT' }
    });
    await indexEmail({ id, subject, body, recipient, sender, status: 'SENT', scheduledAt: job.data.scheduledAt });
  } catch (error) {
    await prisma.emailJob.update({
      where: { id },
      data: { status: 'FAILED' }
    });
    throw error;
  }
}, { 
  connection: redis,
  concurrency: CONCURRENCY
});
