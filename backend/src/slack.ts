import { prisma } from './db';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.SLACK_REDIRECT_URI || 'http://localhost:4000/api/slack/callback';

export function getSlackAuthUrl(tenantId: string) {
  return `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=chat:write,incoming-webhook&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${tenantId}`;
}

export async function handleSlackCallback(code: string, tenantId: string) {
  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    client_secret: SLACK_CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI
  });

  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  
  const data = await res.json();
  if (!data.ok) throw new Error(data.error);

  await prisma.tenant.upsert({
    where: { tenantId },
    update: { slackToken: data.access_token, slackChannelId: data.incoming_webhook?.channel_id },
    create: { tenantId, slackToken: data.access_token, slackChannelId: data.incoming_webhook?.channel_id }
  });
}

export async function sendSlackNotification(tenantId: string, message: string) {
  const tenant = await prisma.tenant.findUnique({ where: { tenantId } });
  if (!tenant || !tenant.slackToken) return;

  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tenant.slackToken}`
    },
    body: JSON.stringify({
      channel: tenant.slackChannelId || '#general',
      text: message
    })
  });
}
