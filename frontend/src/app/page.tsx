'use client';
import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useGetEmailsQuery, useScheduleEmailsMutation } from '@/store/api';
import { useSession, signIn } from 'next-auth/react';
import toast from 'react-hot-toast';
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
        
        <div className="text-center z-10 p-12 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl w-full max-w-md">
          <h1 className="text-4xl font-bold tracking-tight mb-8 text-white/90">Login</h1>
          <button onClick={() => signIn('google')} className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 px-8 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg flex items-center justify-center gap-3 mb-6">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Login with Google
          </button>
          <div className="flex items-center gap-4 mb-6 opacity-50">
            <div className="flex-1 h-px bg-white/20"></div>
            <span className="text-sm">or sign up through email</span>
            <div className="flex-1 h-px bg-white/20"></div>
          </div>
          <input disabled placeholder="Email ID" className="w-full mb-3 p-3 bg-white/5 border border-white/10 rounded-xl outline-none opacity-50 cursor-not-allowed text-white/50" />
          <input disabled placeholder="Password" type="password" className="w-full mb-6 p-3 bg-white/5 border border-white/10 rounded-xl outline-none opacity-50 cursor-not-allowed text-white/50" />
          <button disabled className="w-full bg-green-600/50 text-white/50 px-8 py-3 rounded-xl font-medium cursor-not-allowed">Login</button>
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
    <div className="flex h-screen bg-[#0B0D17] text-white/90 font-sans relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Sidebar */}
      <div className="w-64 bg-white/[0.02] border-r border-white/5 backdrop-blur-md flex flex-col z-10">
        <div className="p-6 border-b border-white/5">
          <h1 className="text-3xl font-black tracking-tighter text-white/90">ONG</h1>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm mb-4">
            {session.user?.image && <img src={session.user.image} alt="Avatar" className="w-10 h-10 rounded-full opacity-90" />}
            <div className="flex flex-col overflow-hidden">
              <span className="font-medium text-sm text-white/90 truncate">{session.user?.name}</span>
              <span className="text-xs text-white/50 truncate">{session.user?.email}</span>
            </div>
          </div>
          
          <button onClick={() => setShowCompose(true)} className="w-full border border-green-500/50 text-green-400 hover:bg-green-500/10 py-2.5 rounded-full font-medium transition-all mb-8 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            Compose
          </button>

          <div className="text-xs font-semibold text-white/40 tracking-wider mb-2 px-2">CORE</div>
          <button onClick={() => setTab('scheduled')} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${tab === 'scheduled' ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:bg-white/5'}`}>
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="font-medium text-sm">Scheduled</span>
            </div>
            <span className="text-xs font-medium bg-white/10 px-2 py-0.5 rounded-full">{scheduled.length}</span>
          </button>
          
          <button onClick={() => setTab('sent')} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${tab === 'sent' ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:bg-white/5'}`}>
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              <span className="font-medium text-sm">Sent</span>
            </div>
            <span className="text-xs font-medium bg-white/10 px-2 py-0.5 rounded-full">{sent.length}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 h-screen overflow-hidden">
        {/* Topbar */}
        <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-white/[0.01] backdrop-blur-sm">
          <div className="relative w-96">
            <input className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-full focus:ring-2 focus:ring-white/20 outline-none text-white/90 placeholder-white/40 backdrop-blur-sm transition-all text-sm" placeholder="Search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <svg className="w-4 h-4 text-white/40 absolute left-4 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          
          <div className="flex items-center gap-4">
            <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/slack/auth?tenantId=tenant1`} target="_blank" className="text-white/50 hover:text-white/90 transition-colors" title="Connect Slack">
               <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.523-2.522v-2.522h2.523zM15.165 17.688a2.527 2.527 0 0 1-2.523-2.523 2.526 2.526 0 0 1 2.523-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.52H15.165z"/></svg>
            </a>
            <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}/admin/queues`} target="_blank" className="text-white/50 hover:text-white/90 transition-colors" title="Queue Dashboard">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </a>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <div className="h-full flex flex-col justify-center items-center gap-4">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/90 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <EmailTable emails={displayEmails} tab={tab} />
              
              {!debouncedSearch && (
                <div className="flex justify-end items-center mt-6 gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/10 disabled:opacity-30 transition-all backdrop-blur-sm"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
                  <button onClick={() => setPage(p => p + 1)} disabled={emails.length < 50} className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/10 disabled:opacity-30 transition-all backdrop-blur-sm"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCompose && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#0f111a] rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col border border-white/10 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3 text-white/90">
                <button onClick={() => setShowCompose(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h2 className="text-xl font-medium">Compose New Email</h2>
              </div>
              <div className="flex items-center gap-4">
                <button className="text-white/50 hover:text-white/90"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg></button>
                <button className="text-white/50 hover:text-white/90"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                <button onClick={handleSchedule} disabled={isScheduling || !subject || !body || recipients.length === 0} className="bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30 px-5 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50">
                  {isScheduling ? 'Sending...' : 'Send Later'}
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
              <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                <span className="text-white/40 text-sm w-12">From</span>
                <div className="bg-white/5 px-3 py-1.5 rounded-lg text-sm text-white/80 border border-white/5">{session.user?.email}</div>
              </div>
              
              <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                <span className="text-white/40 text-sm w-12">To</span>
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  {recipients.slice(0, 3).map((r, i) => (
                    <span key={i} className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-xs">{r}</span>
                  ))}
                  {recipients.length > 3 && (
                    <span className="bg-white/10 text-white/70 border border-white/10 px-2 py-1 rounded-full text-xs">+{recipients.length - 3}</span>
                  )}
                </div>
                <label className="text-green-400 text-sm flex items-center gap-2 cursor-pointer hover:text-green-300">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Upload List
                  <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                </label>
              </div>

              <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                <span className="text-white/40 text-sm w-12">Subject</span>
                <input className="flex-1 bg-transparent border-none outline-none text-white/90 placeholder-white/30" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
              </div>

              <div className="flex items-center gap-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-white/40 text-sm">Delay (sec)</span>
                  <input type="number" className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/80 outline-none text-center" value={delaySecs} onChange={e => setDelaySecs(e.target.value)} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/40 text-sm">Hourly Limit</span>
                  <input type="number" className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/80 outline-none text-center" value={hourlyLimit} onChange={e => setHourlyLimit(e.target.value)} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/40 text-sm">Start Date</span>
                  <input type="datetime-local" className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/80 outline-none [color-scheme:dark]" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                </div>
              </div>

              <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col">
                <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-3 text-white/40">
                  <button className="hover:text-white/80"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                  <button className="hover:text-white/80 font-serif italic">I</button>
                  <button className="hover:text-white/80 font-serif underline">U</button>
                </div>
                <textarea className="flex-1 bg-transparent border-none outline-none text-white/80 placeholder-white/20 resize-none" placeholder="Type Your Reply..." value={body} onChange={e => setBody(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
