import express from 'express';
import cors from 'cors';
import { emailQueue } from './queue';
import { prisma } from './db';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import './worker';

const app = express();
app.use(cors());
app.use(express.json());

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter: serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());

import { searchEmails, bulkIndexEmails } from './elastic';
app.post('/api/schedule', async (req, res) => {
  const { subject, body, recipients, sender, scheduledAt, tenantId, delaySecs, hourlyLimit } = req.body;
  if (!Array.isArray(recipients) || recipients.length === 0) return res.status(400).json({ error: 'recipients array required' });

  const scheduledDate = new Date(scheduledAt);
  const delay = Math.max(0, scheduledDate.getTime() - Date.now());

  const jobsData = recipients.map(recipient => ({
    subject, body, recipient, sender, scheduledAt: scheduledDate, tenantId
  }));

  const records = await prisma.$transaction(async (tx: any) => {
    return tx.emailJob.createManyAndReturn({ data: jobsData });
  });

  const parsedDelay = parseInt(delaySecs) || 0;
  const parsedLimit = parseInt(hourlyLimit) || 200;

  const bulkQueue = records.map((record: any, index: number) => ({
    name: 'send-email',
    data: { ...record, hourlyLimit: parsedLimit },
    opts: { delay: delay + (index * parsedDelay * 1000), jobId: record.id }
  }));
  
  await emailQueue.addBulk(bulkQueue);
  await bulkIndexEmails(records);

  res.json({ success: true, count: recipients.length });
});

app.get('/api/emails', async (req, res) => {
  const page = parseInt(req.query.page as string || '1');
  const emails = await prisma.emailJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    skip: (page - 1) * 50
  });
  res.json(emails);
});

app.get('/api/search', async (req, res) => {
  const q = req.query.q as string;
  if (!q) return res.json([]);
  const results = await searchEmails(q);
  res.json(results);
});

import { getSlackAuthUrl, handleSlackCallback } from './slack';

app.get('/api/slack/auth', (req, res) => {
  const tenantId = req.query.tenantId as string || 'tenant1';
  res.redirect(getSlackAuthUrl(tenantId));
});

app.get('/api/slack/callback', async (req, res) => {
  const { code, state } = req.query;
  try {
    await handleSlackCallback(code as string, state as string);
    res.send('<script>window.close();</script>');
  } catch (err) {
    res.status(500).send('Slack Auth Failed');
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
