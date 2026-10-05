import { EmailJob } from '@/types';

export function EmailTable({ emails, tab }: { emails: EmailJob[], tab: 'scheduled' | 'sent' }) {
  if (emails.length === 0) {
    return <div className="text-center py-16 text-white/40 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-md">No {tab} emails found.</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {emails.map((job) => {
        const timeStr = new Date(tab === 'sent' ? (job.sentAt || job.updatedAt) : job.scheduledAt).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });
        return (
          <div key={job.id} className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-xl transition-colors group cursor-pointer">
            <div className="flex items-center gap-6 flex-1 min-w-0">
              <span className="text-white/90 font-medium text-sm w-48 truncate">To: {job.recipient}</span>
              
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {tab === 'scheduled' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full text-xs font-medium whitespace-nowrap">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {timeStr}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-white/10 text-white/70 border border-white/10 rounded-full text-xs font-medium whitespace-nowrap">
                    Sent
                  </span>
                )}
                
                <div className="text-sm truncate">
                  <span className="font-semibold text-white/90">{job.subject}</span>
                  <span className="text-white/40 mx-2">-</span>
                  <span className="text-white/50">{job.body.substring(0, 80)}...</span>
                </div>
              </div>
            </div>
            
            <button className="text-white/20 hover:text-white/80 opacity-0 group-hover:opacity-100 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
