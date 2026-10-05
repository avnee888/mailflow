import { Client } from '@elastic/elasticsearch';

export const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
});

export async function indexEmail(jobData: any) {
  try {
    await esClient.index({
      index: 'emails',
      id: jobData.id,
      document: {
        subject: jobData.subject,
        body: jobData.body,
        recipient: jobData.recipient,
        sender: jobData.sender,
        status: jobData.status,
        scheduledAt: jobData.scheduledAt,
      }
    });
  } catch (error) {
    console.error('Elasticsearch indexing failed:', error);
  }
}

export async function searchEmails(query: string) {
  try {
    const result = await esClient.search({
      index: 'emails',
      query: {
        multi_match: {
          query,
          fields: ['subject', 'body', 'recipient', 'sender']
        }
      }
    });
    return result.hits.hits.map((h: any) => h._source);
  } catch (error) {
    console.error('Elasticsearch search failed:', error);
    return [];
  }
}
