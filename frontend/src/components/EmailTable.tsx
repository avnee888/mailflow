'use client';
import { EmailJob } from '@/types';
import { useState } from 'react';
import { Dialog } from '@headlessui/react';

export function EmailTable({ emails, tab }: { emails: EmailJob[], tab: 'scheduled' | 'sent' }) {
  const [selectedJob, setSelectedJob] = useState<EmailJob | null>(null);

  if (emails.length === 0) {
    return <div className="text-center py-16 text-gray-400 bg-white border border-gray-100 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.02)]">No {tab} emails found.</div>;
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {emails.map((job) => {
          const timeStr = new Date(tab === 'sent' ? (job.sentAt || job.updatedAt) : job.scheduledAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });
          return (
            <div key={job.id} onClick={() => setSelectedJob(job)} className="flex items-center justify-between px-6 py-4 bg-white hover:bg-gray-50 border-b border-gray-100 transition-colors group cursor-pointer">
              <div className="flex items-center gap-6 flex-1 min-w-0">
                <span className="text-gray-900 font-medium text-[13px] w-48 truncate">To: {job.recipient}</span>
                
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {tab === 'scheduled' ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#FFF6EE] text-[#F38A38] rounded-full text-xs font-semibold whitespace-nowrap">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {timeStr}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold whitespace-nowrap">
                      Sent
                    </span>
                  )}
                  
                  <div className="text-[13px] truncate">
                    <span className="font-semibold text-gray-900">{job.subject}</span>
                    <span className="text-gray-500 mx-2">- {tab === 'scheduled' ? 'Scheduled - ' : 'Sent - '}</span>
                    <span className="text-gray-400">{job.body.substring(0, 80)}...</span>
                  </div>
                </div>
              </div>
              
              <button className="text-gray-300 hover:text-[#F38A38] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!selectedJob} onClose={() => setSelectedJob(null)} className="relative z-50">
        <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg w-full bg-white rounded-xl shadow-2xl p-6">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">Email Details</Dialog.Title>
            {selectedJob && (
              <div className="space-y-4 text-[14px]">
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-gray-500 font-medium">To:</span>
                  <span className="text-gray-900">{selectedJob.recipient}</span>
                  
                  <span className="text-gray-500 font-medium">From:</span>
                  <span className="text-gray-900">{selectedJob.sender}</span>
                  
                  <span className="text-gray-500 font-medium">Subject:</span>
                  <span className="text-gray-900 font-semibold">{selectedJob.subject}</span>
                  
                  <span className="text-gray-500 font-medium">Time:</span>
                  <span className="text-gray-900">
                    {new Date(tab === 'sent' ? (selectedJob.sentAt || selectedJob.updatedAt) : selectedJob.scheduledAt).toLocaleString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })}
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{tab === 'sent' ? 'Sent' : 'Scheduled'}</span>
                  </span>
                </div>
                
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <span className="text-gray-500 font-medium block mb-2">Message:</span>
                  <div className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap border border-gray-100 min-h-[100px]">
                    {selectedJob.body}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}
