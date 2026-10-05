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
  const { subject, body, recipient, sender, scheduledAt, tenantId } = req.body;
  
  const jobRecord = await prisma.emailJob.create({
    data: {
      subject, body, recipient, sender, scheduledAt: new Date(scheduledAt), tenantId
    }
  });

  const delay = new Date(scheduledAt).getTime() - Date.now();
  
  await emailQueue.add('send-email', jobRecord, {
    delay: Math.max(0, delay),
    jobId: jobRecord.id
  });

  res.json({ success: true, job: jobRecord });
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
