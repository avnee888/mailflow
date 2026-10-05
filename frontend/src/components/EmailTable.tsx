import { EmailJob } from '@/types';

export function EmailTable({ emails, tab }: { emails: EmailJob[], tab: 'scheduled' | 'sent' }) {
  if (emails.length === 0) {
    return <div className="text-center py-16 text-white/40 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-md">No {tab} emails found.</div>;
  }

  return (
    <div className="overflow-x-auto bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
            <th className="p-4 font-medium">Email</th>
            <th className="p-4 font-medium">Subject</th>
            <th className="p-4 font-medium">{tab === 'sent' ? 'Sent Time' : 'Time'}</th>
            <th className="p-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {emails.map((job) => (
            <tr key={job.id} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors duration-200 text-white/80">
              <td className="p-4">{job.recipient}</td>
              <td className="p-4 font-medium text-white/90">{job.subject}</td>
              <td className="p-4 text-white/50">{new Date(tab === 'sent' ? (job.sentAt || job.updatedAt) : job.scheduledAt).toLocaleString()}</td>
              <td className="p-4">
                <span className={`px-3 py-1 text-xs rounded-full border backdrop-blur-sm ${
                  job.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-200/90 border-yellow-500/20' : 
                  job.status === 'SENT' ? 'bg-green-500/10 text-green-200/90 border-green-500/20' : 
                  'bg-red-500/10 text-red-200/90 border-red-500/20'}`}>
                  {job.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
