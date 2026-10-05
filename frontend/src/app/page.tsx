'use client';
import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useGetEmailsQuery, useScheduleEmailsMutation } from '@/store/api';
import { useSession, signIn, signOut } from 'next-auth/react';

type EmailJob = {
  id: string; subject: string; body: string; recipient: string; sender: string; scheduledAt: string; status: string;
};

export default function Dashboard() {
  const { data: session } = useSession();
  
  const [tab, setTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [showCompose, setShowCompose] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [delaySecs, setDelaySecs] = useState('2');
  const [hourlyLimit, setHourlyLimit] = useState('200');
  const [recipients, setRecipients] = useState<string[]>([]);
  
  const { data: emails = [], isLoading } = useGetEmailsQuery({ search: debouncedSearch, page }, { pollingInterval: 5000 });
  const [scheduleEmails, { isLoading: isScheduling }] = useScheduleEmailsMutation();

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <button onClick={() => signIn('google')} className="bg-blue-600 text-white px-6 py-3 rounded text-lg">Sign in with Google</button>
      </div>
    );
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<{ email: string }>(file, {
      header: true,
      complete: (results) => {
        const parsed = results.data.map(row => row.email).filter(Boolean);
        if (parsed.length === 0) {
          alert("No 'email' column found in CSV.");
          return;
        }
        setRecipients(parsed);
      }
    });
  };

  const handleSchedule = async () => {
    if (recipients.length === 0) return;
    await scheduleEmails({
      subject, body, recipients, sender: session?.user?.email || 'test@example.com', scheduledAt, 
      tenantId: 'tenant1', delaySecs: parseInt(delaySecs) || 0, hourlyLimit: parseInt(hourlyLimit) || 200
    });
    setShowCompose(false);
  };

  const scheduled = emails.filter((e: EmailJob) => e.status === 'PENDING');
  const sent = emails.filter((e: EmailJob) => e.status !== 'PENDING');

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold">ReachInbox Scheduler</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {session.user?.image && <img src={session.user.image} alt="Avatar" className="w-8 h-8 rounded-full" />}
            <span className="font-semibold">{session.user?.name}</span>
            <span className="text-sm text-gray-500">({session.user?.email})</span>
          </div>
          <button onClick={() => signOut()} className="text-red-600 text-sm border border-red-600 px-2 py-1 rounded">Logout</button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-4">
          <button onClick={() => setShowCompose(true)} className="bg-blue-600 text-white px-4 py-2 rounded">Compose New Email</button>
          <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/slack/auth?tenantId=tenant1`} target="_blank" className="bg-purple-600 text-white px-4 py-2 rounded">Connect Slack</a>
          <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}/admin/queues`} target="_blank" className="bg-gray-200 px-4 py-2 rounded">Queue Dashboard</a>
        </div>
      </div>

      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded shadow-lg max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl mb-4">Compose</h2>
            <input className="block w-full mb-2 p-2 border" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
            <textarea className="block w-full mb-2 p-2 border" placeholder="Body" value={body} onChange={e => setBody(e.target.value)} />
            
            <div className="flex gap-4 mb-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 uppercase">Start Time</label>
                <input className="block w-full p-2 border" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 uppercase">Delay (sec)</label>
                <input className="block w-full p-2 border" type="number" min="0" value={delaySecs} onChange={e => setDelaySecs(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 uppercase">Hr Limit</label>
                <input className="block w-full p-2 border" type="number" min="1" value={hourlyLimit} onChange={e => setHourlyLimit(e.target.value)} />
              </div>
            </div>

            <input className="block w-full mb-2 p-2 border" type="file" accept=".csv" onChange={handleCsvUpload} />
            {recipients.length > 0 && <p className="mb-4 text-sm text-gray-600">Loaded {recipients.length} recipients</p>}
            
            <button onClick={handleSchedule} disabled={isScheduling} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">
              {isScheduling ? 'Scheduling...' : 'Schedule'}
            </button>
            <button onClick={() => setShowCompose(false)} className="ml-2 text-red-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <div className="flex gap-4">
          <button onClick={() => setTab('scheduled')} className={tab === 'scheduled' ? 'font-bold text-blue-600' : ''}>Scheduled</button>
          <button onClick={() => setTab('sent')} className={tab === 'sent' ? 'font-bold text-blue-600' : ''}>Sent / Failed</button>
        </div>
        <input className="p-2 border rounded" placeholder="Search emails (Elasticsearch)" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      {isLoading ? <p>Loading...</p> : (
        <>
          <table className="w-full text-left mb-4">
            <thead>
              <tr className="border-b bg-gray-50"><th className="p-2">Email</th><th className="p-2">Subject</th><th className="p-2">Time</th><th className="p-2">Status</th></tr>
            </thead>
            <tbody>
              {(tab === 'scheduled' ? scheduled : sent).map((job: EmailJob) => (
                <tr key={job.id} className="border-b">
                  <td className="p-2">{job.recipient}</td>
                  <td className="p-2">{job.subject}</td>
                  <td className="p-2">{new Date(job.scheduledAt).toLocaleString()}</td>
                  <td className="p-2">{job.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {!debouncedSearch && (
            <div className="flex gap-4 items-center">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
              <span>Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={emails.length < 50} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
