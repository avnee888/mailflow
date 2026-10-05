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

app.post('/api/schedule', async (req, res) => {
  const { subject, body, recipients, sender, scheduledAt, tenantId } = req.body;
  if (!Array.isArray(recipients) || recipients.length === 0) return res.status(400).json({ error: 'recipients array required' });

  const scheduledDate = new Date(scheduledAt);
  const delay = Math.max(0, scheduledDate.getTime() - Date.now());

  const jobsData = recipients.map(recipient => ({
    subject, body, recipient, sender, scheduledAt: scheduledDate, tenantId
  }));

  await prisma.$transaction(async (tx: any) => {
    const records = await tx.emailJob.createManyAndReturn({ data: jobsData });
    const bulkQueue = records.map((record: any) => ({
      name: 'send-email',
      data: record,
      opts: { delay, jobId: record.id }
    }));
    await emailQueue.addBulk(bulkQueue);
  });

  res.json({ success: true, count: recipients.length });
});

app.get('/api/emails', async (req, res) => {
  const emails = await prisma.emailJob.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json(emails);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
