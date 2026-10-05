'use client';
import { useState, useEffect } from 'react';
import Papa from 'papaparse';

type EmailJob = {
  id: string; subject: string; body: string; recipient: string; sender: string; scheduledAt: string; status: string;
};

export default function Dashboard() {
  const [tab, setTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [showCompose, setShowCompose] = useState(false);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  
  const fetchEmails = async () => {
    const res = await fetch('http://localhost:4000/api/emails');
    const data = await res.json();
    setEmails(data);
  };

  useEffect(() => { fetchEmails(); }, []);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<{ email: string }>(file, {
      header: true,
      complete: (results) => {
        const parsed = results.data.map(row => row.email).filter(Boolean);
        setRecipients(parsed);
      }
    });
  };

  const handleSchedule = async () => {
    if (recipients.length === 0) return;
    await fetch('http://localhost:4000/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject, body, recipients, sender: 'test@example.com', scheduledAt, tenantId: 'tenant1'
      })
    });
    setShowCompose(false);
    fetchEmails();
  };

  const scheduled = emails.filter(e => e.status === 'PENDING');
  const sent = emails.filter(e => e.status !== 'PENDING');

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">ReachInbox Scheduler</h1>
        <div className="flex gap-4">
          <button onClick={() => setShowCompose(true)} className="bg-blue-600 text-white px-4 py-2 rounded">Compose New Email</button>
          <a href="http://localhost:4000/admin/queues" target="_blank" className="bg-gray-200 px-4 py-2 rounded">Queue Dashboard</a>
        </div>
      </div>

      {showCompose && (
        <div className="mb-8 p-4 border rounded bg-gray-50">
          <h2 className="text-xl mb-4">Compose</h2>
          <input className="block w-full mb-2 p-2 border" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
          <textarea className="block w-full mb-2 p-2 border" placeholder="Body" value={body} onChange={e => setBody(e.target.value)} />
          <input className="block w-full mb-2 p-2 border" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          <input className="block w-full mb-2 p-2 border" type="file" accept=".csv" onChange={handleCsvUpload} />
          {recipients.length > 0 && <p className="mb-2 text-sm text-gray-600">Loaded {recipients.length} recipients</p>}
          <button onClick={handleSchedule} className="bg-green-600 text-white px-4 py-2 rounded">Schedule</button>
          <button onClick={() => setShowCompose(false)} className="ml-2 text-red-600">Cancel</button>
        </div>
      )}

      <div className="flex gap-4 mb-4 border-b pb-2">
        <button onClick={() => setTab('scheduled')} className={tab === 'scheduled' ? 'font-bold text-blue-600' : ''}>Scheduled</button>
        <button onClick={() => setTab('sent')} className={tab === 'sent' ? 'font-bold text-blue-600' : ''}>Sent / Failed</button>
      </div>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b bg-gray-50"><th className="p-2">Email</th><th className="p-2">Subject</th><th className="p-2">Time</th><th className="p-2">Status</th></tr>
        </thead>
        <tbody>
          {(tab === 'scheduled' ? scheduled : sent).map(job => (
            <tr key={job.id} className="border-b">
              <td className="p-2">{job.recipient}</td>
              <td className="p-2">{job.subject}</td>
              <td className="p-2">{new Date(job.scheduledAt).toLocaleString()}</td>
              <td className="p-2">{job.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
