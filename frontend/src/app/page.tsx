'use client';
import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useGetEmailsQuery, useScheduleEmailsMutation } from '@/store/api';
import { useSession, signIn } from 'next-auth/react';
import toast from 'react-hot-toast';
import { Header } from '@/components/Header';
import { EmailTable } from '@/components/EmailTable';
import { EmailJob } from '@/types';

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
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">ReachInbox Scheduler</h1>
          <button onClick={() => signIn('google')} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg shadow-lg font-medium transition">Sign in with Google</button>
        </div>
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
          toast.error("No 'email' column found in CSV.");
          return;
        }
        setRecipients(parsed);
        toast.success(`Loaded ${parsed.length} recipients`);
      }
    });
  };

  const handleSchedule = async () => {
    if (recipients.length === 0) return;
    try {
      await scheduleEmails({
        subject, body, recipients, sender: session?.user?.email || 'test@example.com', scheduledAt, 
        tenantId: 'tenant1', delaySecs: parseInt(delaySecs) || 0, hourlyLimit: parseInt(hourlyLimit) || 200
      }).unwrap();
      toast.success('Emails scheduled successfully');
      setShowCompose(false);
    } catch (error: any) {
      toast.error(`Scheduling failed: ${error?.data?.error || error.message || 'Unknown error'}`);
    }
  };

  const scheduled = emails.filter((e: EmailJob) => e.status === 'PENDING');
  const sent = emails.filter((e: EmailJob) => e.status !== 'PENDING');
  const displayEmails = tab === 'scheduled' ? scheduled : sent;

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans bg-gray-50 min-h-screen">
      <Header />

      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex gap-4">
          <button onClick={() => setShowCompose(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition shadow-sm">Compose New Email</button>
          <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/slack/auth?tenantId=tenant1`} target="_blank" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition shadow-sm">Connect Slack</a>
          <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}/admin/queues`} target="_blank" className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2 rounded-lg font-medium transition border border-gray-200">Queue Dashboard</a>
        </div>
      </div>

      {showCompose && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Compose New Campaign</h2>
            <input className="block w-full mb-4 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
            <textarea className="block w-full mb-4 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition min-h-[120px]" placeholder="Body" value={body} onChange={e => setBody(e.target.value)} />
            
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Start Time</label>
                <input className="block w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Delay (sec)</label>
                <input className="block w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" type="number" min="0" value={delaySecs} onChange={e => setDelaySecs(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Hr Limit</label>
                <input className="block w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" type="number" min="1" value={hourlyLimit} onChange={e => setHourlyLimit(e.target.value)} />
              </div>
            </div>

            <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Recipients (CSV)</label>
              <input className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" type="file" accept=".csv" onChange={handleCsvUpload} />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setShowCompose(false)} className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition">Cancel</button>
              <button onClick={handleSchedule} disabled={isScheduling || !subject || !body || recipients.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 transition shadow-sm">
                {isScheduling ? 'Scheduling...' : 'Schedule Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
          <button onClick={() => setTab('scheduled')} className={`px-6 py-2 rounded-md font-medium text-sm transition ${tab === 'scheduled' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>Scheduled ({scheduled.length})</button>
          <button onClick={() => setTab('sent')} className={`px-6 py-2 rounded-md font-medium text-sm transition ${tab === 'sent' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>Sent / Failed ({sent.length})</button>
        </div>
        <div className="relative w-full md:w-72">
          <input className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Search across all emails..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500 font-medium">Loading emails...</span>
        </div>
      ) : (
        <>
          <EmailTable emails={displayEmails} tab={tab} />
          
          {!debouncedSearch && (
            <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <span className="text-sm text-gray-500">Showing page {page}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition">Previous</button>
                <button onClick={() => setPage(p => p + 1)} disabled={emails.length < 50} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
