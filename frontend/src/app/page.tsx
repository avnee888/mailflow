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
      <div className="flex h-screen items-center justify-center bg-[#0B0D17] relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
        
        <div className="text-center z-10 p-12 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl">
          <h1 className="text-4xl font-bold tracking-tight mb-8 text-white/90">ReachInbox</h1>
          <button onClick={() => signIn('google')} className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-8 py-3 rounded-full font-medium transition-all duration-300 shadow-lg flex items-center gap-3 mx-auto">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Continue with Google
          </button>
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
    <div className="min-h-screen bg-[#0B0D17] text-white/90 p-8 font-sans relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <Header />

        <div className="flex flex-wrap justify-between items-center mb-10 gap-4 bg-white/[0.02] p-5 rounded-2xl border border-white/5 backdrop-blur-md">
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowCompose(true)} className="bg-blue-600/80 hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] border border-blue-500/50">Compose Campaign</button>
            <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/slack/auth?tenantId=tenant1`} target="_blank" className="bg-white/5 hover:bg-white/10 text-white/90 px-6 py-2.5 rounded-full font-medium transition-all border border-white/10 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.523-2.522v-2.522h2.523zM15.165 17.688a2.527 2.527 0 0 1-2.523-2.523 2.526 2.526 0 0 1 2.523-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.52H15.165z"/></svg>
              Slack
            </a>
            <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}/admin/queues`} target="_blank" className="bg-white/5 hover:bg-white/10 text-white/90 px-6 py-2.5 rounded-full font-medium transition-all border border-white/10">Queue</a>
          </div>
        </div>

        {showCompose && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-[#131520] p-8 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
              <h2 className="text-2xl font-semibold mb-6 text-white/90 tracking-tight">New Campaign</h2>
              <input className="block w-full mb-4 p-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition text-white/90 placeholder-white/40" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
              <textarea className="block w-full mb-4 p-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition min-h-[120px] text-white/90 placeholder-white/40" placeholder="Email body..." value={body} onChange={e => setBody(e.target.value)} />
              
              <div className="flex gap-4 mb-5">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Start Time</label>
                  <input className="block w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-white/80 [color-scheme:dark]" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Delay (sec)</label>
                  <input className="block w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-white/80" type="number" min="0" value={delaySecs} onChange={e => setDelaySecs(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Hr Limit</label>
                  <input className="block w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-white/80" type="number" min="1" value={hourlyLimit} onChange={e => setHourlyLimit(e.target.value)} />
                </div>
              </div>

              <div className="mb-8 p-6 border border-dashed border-white/20 rounded-xl bg-white/[0.02]">
                <label className="block text-sm font-medium text-white/70 mb-3">Upload Recipients (CSV)</label>
                <input className="block w-full text-sm text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-white/10 file:text-white/90 hover:file:bg-white/20 transition-all cursor-pointer" type="file" accept=".csv" onChange={handleCsvUpload} />
              </div>
              
              <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                <button onClick={() => setShowCompose(false)} className="px-6 py-2.5 text-white/60 font-medium hover:bg-white/5 rounded-full transition-all">Cancel</button>
                <button onClick={handleSchedule} disabled={isScheduling || !subject || !body || recipients.length === 0} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-full font-medium disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-500/50">
                  {isScheduling ? 'Scheduling...' : 'Launch'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
          <div className="flex gap-1 bg-white/5 p-1.5 rounded-full border border-white/10 backdrop-blur-sm">
            <button onClick={() => setTab('scheduled')} className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${tab === 'scheduled' ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>Scheduled ({scheduled.length})</button>
            <button onClick={() => setTab('sent')} className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${tab === 'sent' ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>Sent / Failed ({sent.length})</button>
          </div>
          <div className="relative w-full md:w-80">
            <input className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-full focus:ring-2 focus:ring-white/20 outline-none text-white/90 placeholder-white/40 backdrop-blur-sm transition-all" placeholder="Search global (Elasticsearch)..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <svg className="w-4 h-4 text-white/40 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col justify-center items-center gap-4">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/90 rounded-full animate-spin"></div>
            <span className="text-white/40 font-medium tracking-wide">Syncing data...</span>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <EmailTable emails={displayEmails} tab={tab} />
            
            {!debouncedSearch && (
              <div className="flex justify-between items-center mt-8 px-2">
                <span className="text-sm font-medium text-white/40">Page {page}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-5 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium text-white/80 hover:bg-white/10 disabled:opacity-30 transition-all backdrop-blur-sm">Previous</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={emails.length < 50} className="px-5 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium text-white/80 hover:bg-white/10 disabled:opacity-30 transition-all backdrop-blur-sm">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
