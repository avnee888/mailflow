# ReachInbox Scheduler Assignment

Full-stack email job scheduler using Express, Next.js, BullMQ, Redis, PostgreSQL, and Elasticsearch.

## Setup & Run

### Environment Variables
Create `backend/.env` with:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mailflow?schema=public"
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
ELASTICSEARCH_URL="http://localhost:9200"
MAX_EMAILS_PER_HOUR=200
MIN_DELAY_MS=2000
WORKER_CONCURRENCY=5

# Get these from https://ethereal.email/create
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=YOUR_USER
SMTP_PASS=YOUR_PASS

# Get these from api.slack.com
SLACK_CLIENT_ID=YOUR_SLACK_CLIENT_ID
SLACK_CLIENT_SECRET=YOUR_SLACK_CLIENT_SECRET
```

### Infrastructure
```bash
docker-compose up -d
```

### Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Architecture Overview

**How scheduling works (No Cron)**
When the frontend schedules emails (bulk or single), the Express API calculates the timestamp difference `delay = scheduledAt - now`. The jobs are pushed to BullMQ with `opts: { delay }`. Redis stores them natively in a zset. The worker only picks them up once the timestamp hits. 

**Persistence on Restart**
BullMQ persists all queue states in Redis. If the Node.js server dies, no jobs are lost. Upon restart, BullMQ reconnects to Redis and resumes processing delayed jobs exactly when they are due. Idempotency is preserved by mapping `jobId` to the Postgres record ID.

**Rate Limiting & Concurrency**
- **Concurrency**: Controlled natively via BullMQ's `concurrency` option on the Worker (set to 5). Parallel execution is thread-safe.
- **Delay**: Uses BullMQ's native global limiter `limiter: { max: 1, duration: 2000 }` to throttle provider throughput securely across all workers without blocking the event loop.
- **Rate Limiting**: Custom logic using Redis counters (`rate:{sender}:{hourKey}`). This ensures exact tenant/sender tracking across multiple scaled worker instances. If the counter exceeds `MAX_EMAILS_PER_HOUR`, we calculate the ms delay to the next top-of-hour, call `job.moveToDelayed()`, and throw a `DelayedError`. The job is paused and safely moved to the next hour block without failing.
- **Slack Alert**: If the rate limit is hit, an OAuth-generated token is used to post a message directly to the tenant's Slack channel.

## Features Implemented

**Backend**
- BullMQ delayed job scheduler
- Redis-backed rate limiting (per sender/hour)
- Ethereal fake SMTP delivery
- Slack OAuth integration and alerts
- Elasticsearch indexing and full-text search API

**Frontend**
- Next.js + Tailwind UI matching Figma layout
- RTK Query state management
- CSV parsing for bulk recipients
- Elasticsearch search input
- Live BullMQ dashboard link

## Assumptions & Trade-offs
- Used `createManyAndReturn` and `addBulk` for high-throughput batching, saving browser and API roundtrips.
- Assumed tenant-isolation for rate limits is based on the `sender` email address.
- Used a monolithic Express repo rather than microservices for simplicity, but abstracted the worker, API, and Elasticsearch sync.
- Elasticsearch errors are caught and logged so they don't break the main worker loop if ES is temporarily down.

## Demo Video Guide
1. Start containers, backend, and frontend.
2. Upload CSV in Dashboard, schedule for current time.
3. Show Queue Dashboard (Bull Board) processing jobs.
4. Kill backend server. Wait 10 seconds. Restart. Watch jobs resume flawlessly.
5. Set `MAX_EMAILS_PER_HOUR=2` and schedule 5 emails to demonstrate rate limit slack ping and next-hour rescheduling.