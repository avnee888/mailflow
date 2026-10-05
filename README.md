# Mailflow Email Scheduler

## Run backend
```bash
docker-compose up -d
cd backend
npx prisma generate
npx prisma db push
npm run dev
```

## Run frontend
```bash
cd frontend
npm run dev
```

## Environment (backend/.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mailflow?schema=public"
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
ELASTICSEARCH_URL="http://localhost:9200"
MAX_EMAILS_PER_HOUR=200
MIN_DELAY_MS=2000
WORKER_CONCURRENCY=5
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=YOUR_ETHEREAL_USER
SMTP_PASS=YOUR_ETHEREAL_PASS
```

## Architecture
- **Scheduling**: BullMQ delayed jobs. No cron. Express API adds job with `delay`.
- **Persistence**: BullMQ stores jobs in Redis. Next run times survive restart. Idempotency handled by `jobId`.
- **Rate limiting**: Redis counters (`rate:sender:hour`). Over limit pushes job to next hour `moveToDelayed` with `DelayedError`.
- **Concurrency**: Handled by BullMQ `concurrency: 5`.