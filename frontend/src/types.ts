export type EmailJob = {
  id: string; 
  subject: string; 
  body: string; 
  recipient: string; 
  sender: string; 
  scheduledAt: string; 
  status: string; 
  updatedAt: string;
  sentAt?: string;
};
