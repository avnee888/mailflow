import { EmailJob } from '@/types';

export function EmailTable({ emails, tab }: { emails: EmailJob[], tab: 'scheduled' | 'sent' }) {
  if (emails.length === 0) {
    return <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">No {tab} emails found.</div>;
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b bg-gray-100 text-gray-600 text-sm">
            <th className="p-3">Email</th>
            <th className="p-3">Subject</th>
            <th className="p-3">{tab === 'sent' ? 'Sent Time' : 'Time'}</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {emails.map((job) => (
            <tr key={job.id} className="border-b hover:bg-gray-50 transition">
              <td className="p-3">{job.recipient}</td>
              <td className="p-3 font-medium text-gray-800">{job.subject}</td>
              <td className="p-3 text-gray-500">{new Date(tab === 'sent' ? (job.sentAt || job.updatedAt) : job.scheduledAt).toLocaleString()}</td>
              <td className="p-3">
                <span className={`px-2 py-1 text-xs rounded-full ${job.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : job.status === 'SENT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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
