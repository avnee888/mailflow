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
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [delaySecs, setDelaySecs] = useState('2');
  const [hourlyLimit, setHourlyLimit] = useState('200');
  const [recipients, setRecipients] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: emails = [],
    isLoading
  } = useGetEmailsQuery(
    {
      search: debouncedSearch,
      page,
      tenantId: session?.user?.email || 'tenant1'
    },
    {
      pollingInterval: 5000,
      skip: !session
    }
  );

  const [scheduleEmails, { isLoading: isScheduling }] =
    useScheduleEmailsMutation();

  /*
   * Convert the value coming from datetime-local
   * into a proper UTC ISO timestamp.
   *
   * Example:
   * 06:30 IST -> 01:00 UTC
   */
  const localDateTimeToISOString = (dateTime: string) => {
    if (!dateTime) {
      return new Date().toISOString();
    }

    const localDate = new Date(dateTime);

    return localDate.toISOString();
  };

  /*
   * Format a Date object for datetime-local input.
   *
   * IMPORTANT:
   * Do not use toISOString() here because that converts
   * the date to UTC.
   */
  const formatLocalDateTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-white relative overflow-hidden">
        <div className="text-center z-10 p-12 bg-white border border-gray-100 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] w-full max-w-md">
          <h1 className="text-3xl font-bold tracking-tight mb-8 text-black">
            Login
          </h1>

          <button
            onClick={() => signIn('google')}
            className="w-full bg-[#E5F5E9] hover:bg-[#d6ebd9] text-gray-800 px-8 py-3 rounded-md font-medium transition-colors flex items-center justify-center gap-3 mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>

            <span className="text-sm">Login with Google</span>
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-xs text-gray-400">
              or sign up through email
            </span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          <input
            disabled
            placeholder="Email ID"
            className="w-full mb-3 p-3 bg-[#F4F5F6] border-none rounded-md outline-none text-sm text-gray-500 placeholder-gray-400"
          />

          <input
            disabled
            placeholder="Password"
            type="password"
            className="w-full mb-6 p-3 bg-[#F4F5F6] border-none rounded-md outline-none text-sm text-gray-500 placeholder-gray-400"
          />

          <button
            disabled
            className="w-full bg-[#00B752] text-white px-8 py-3 rounded-md font-medium text-sm"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  const handleCsvUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    Papa.parse<{ email: string }>(file, {
      header: true,

      complete: (results) => {
        const parsed = results.data
          .map((row) => row.email)
          .filter(Boolean);

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
        subject,
        body,
        recipients,
        sender: session?.user?.email || 'test@example.com',

        // Convert the local datetime selected by the user
        // into UTC before sending to backend.
        scheduledAt: localDateTimeToISOString(scheduledAt),

        tenantId: session?.user?.email || 'tenant1',
        delaySecs: parseInt(delaySecs) || 0,
        hourlyLimit: parseInt(hourlyLimit) || 200
      }).unwrap();

      toast.success('Emails scheduled successfully');

      setShowCompose(false);
      setShowSchedulePopup(false);
    } catch (error: any) {
      toast.error(
        `Scheduling failed: ${
          error?.data?.error ||
          error.message ||
          'Unknown error'
        }`
      );
    }
  };

  const scheduled = emails.filter(
    (e: EmailJob) => e.status === 'PENDING'
  );

  const sent = emails.filter(
    (e: EmailJob) => e.status !== 'PENDING'
  );

  const displayEmails =
    tab === 'scheduled' ? scheduled : sent;

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans relative overflow-hidden">

      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col z-10 flex-shrink-0">

        <div className="px-6 py-5">
          <h1 className="text-[32px] leading-none tracking-widest text-black font-[family-name:var(--font-vt323)] uppercase">
            ONG
          </h1>
        </div>

        <div className="px-4 pb-4">

          <div className="flex items-center gap-3 p-2 bg-[#F4F5F6] rounded-xl mb-4">

            {session.user?.image ? (
              <img
                src={session.user.image}
                alt="Avatar"
                className="w-9 h-9 rounded-full"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-300"></div>
            )}

            <div className="flex flex-col overflow-hidden">

              <span className="font-semibold text-[13px] text-gray-900 truncate leading-tight">
                {session.user?.name}
              </span>

              <span className="text-[11px] text-gray-500 truncate">
                {session.user?.email}
              </span>

            </div>

            <svg
              className="w-4 h-4 text-gray-400 ml-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>

          </div>

          <button
            onClick={() => setShowCompose(true)}
            className="w-full border border-[#00B752] text-[#00B752] hover:bg-[#E5F5E9] py-2 rounded-full font-semibold text-sm transition-colors mb-6 flex justify-center"
          >
            Compose
          </button>

          <div className="text-[10px] font-semibold text-gray-400 tracking-widest mb-2 px-3">
            CORE
          </div>

          <button
            onClick={() => setTab('scheduled')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              tab === 'scheduled'
                ? 'bg-[#E5F5E9] text-[#00B752]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">

              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <span className="font-medium text-sm">
                Scheduled
              </span>

            </div>

            <span
              className={`text-[11px] font-medium ${
                tab === 'scheduled'
                  ? 'text-[#00B752]'
                  : 'text-gray-400'
              }`}
            >
              {scheduled.length}
            </span>

          </button>

          <button
            onClick={() => setTab('sent')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors mt-1 ${
              tab === 'sent'
                ? 'bg-[#E5F5E9] text-[#00B752]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >

            <div className="flex items-center gap-3">

              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>

              <span className="font-medium text-sm">
                Sent
              </span>

            </div>

            <span
              className={`text-[11px] font-medium ${
                tab === 'sent'
                  ? 'text-[#00B752]'
                  : 'text-gray-400'
              }`}
            >
              {sent.length}
            </span>

          </button>

        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 h-screen overflow-hidden bg-white">

        {/* Topbar */}
        <div className="h-16 flex items-center justify-between px-6 bg-white">

          <div className="flex items-center gap-4 flex-1">

            <div className="relative w-[400px]">

              <svg
                className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>

              <input
                className="w-full pl-9 pr-4 py-2 bg-[#F4F5F6] border-none rounded-full outline-none text-sm text-gray-700 placeholder-gray-400"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
              />

            </div>

            <button className="text-gray-400 hover:text-gray-600">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>

            <button className="text-gray-400 hover:text-gray-600">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-2">

          {isLoading ? (

            <div className="h-full flex flex-col justify-center items-center gap-4">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
            </div>

          ) : (

            <div>

              <EmailTable
                emails={displayEmails}
                tab={tab}
              />

              {!debouncedSearch && (
                <div className="flex justify-end items-center mt-6 gap-2">

                  <button
                    onClick={() =>
                      setPage((p) => Math.max(1, p - 1))
                    }
                    disabled={page === 1}
                    className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={() =>
                      setPage((p) => p + 1)
                    }
                    disabled={emails.length < 50}
                    className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>

                </div>
              )}

            </div>

          )}

        </div>
      </div>

      {/* Compose */}
      {showCompose && (

        <div className="fixed inset-0 bg-white z-50 flex flex-col">

          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">

            <div className="flex items-center gap-3 text-gray-800">

              <button
                onClick={() => setShowCompose(false)}
                className="hover:bg-gray-100 p-1.5 rounded-full transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>

              <h2 className="text-lg font-medium">
                Compose New Email
              </h2>

            </div>

            <div className="flex items-center gap-4 relative">

              <button className="text-gray-400 hover:text-gray-600">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>

              <button
                onClick={() =>
                  setShowSchedulePopup(!showSchedulePopup)
                }
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              <button
                onClick={handleSchedule}
                disabled={
                  isScheduling ||
                  !subject ||
                  !body ||
                  recipients.length === 0
                }
                className="border border-[#00B752] text-[#00B752] hover:bg-[#E5F5E9] px-6 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isScheduling ? 'Sending...' : 'Send'}
              </button>

              {showSchedulePopup && (

                <div className="absolute top-12 right-0 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.1)] rounded-xl w-64 border border-gray-100 z-50 overflow-hidden">

                  <div className="p-4 border-b border-gray-100">

                    <div className="font-semibold text-sm mb-3 text-gray-800">
                      Send Later
                    </div>

                    <div className="relative">

                      <input
                        type="datetime-local"
                        className="w-full text-xs text-gray-600 outline-none"
                        value={scheduledAt}
                        onChange={(e) =>
                          setScheduledAt(e.target.value)
                        }
                      />

                    </div>
                  </div>

                  <div className="p-2">

                    {/* Tomorrow 9 AM */}
                    <button
                      onClick={() => {
                        const d = new Date();

                        d.setDate(d.getDate() + 1);
                        d.setHours(9, 0, 0, 0);

                        setScheduledAt(
                          formatLocalDateTime(d)
                        );
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-md"
                    >
                      Tomorrow, 9:00 AM
                    </button>

                    {/* Tomorrow 10 AM */}
                    <button
                      onClick={() => {
                        const d = new Date();

                        d.setDate(d.getDate() + 1);
                        d.setHours(10, 0, 0, 0);

                        setScheduledAt(
                          formatLocalDateTime(d)
                        );
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-md"
                    >
                      Tomorrow, 10:00 AM
                    </button>

                    {/* Tomorrow 11 AM */}
                    <button
                      onClick={() => {
                        const d = new Date();

                        d.setDate(d.getDate() + 1);
                        d.setHours(11, 0, 0, 0);

                        setScheduledAt(
                          formatLocalDateTime(d)
                        );
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-md"
                    >
                      Tomorrow, 11:00 AM
                    </button>

                  </div>

                  <div className="p-3 flex justify-end gap-3 border-t border-gray-100">

                    <button
                      onClick={() =>
                        setShowSchedulePopup(false)
                      }
                      className="text-xs font-semibold text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() =>
                        setShowSchedulePopup(false)
                      }
                      className="border border-[#00B752] text-[#00B752] text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-[#E5F5E9]"
                    >
                      Done
                    </button>

                  </div>

                </div>
              )}

            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto px-20 py-8 flex flex-col max-w-5xl mx-auto w-full">

            <div className="flex items-center gap-6 border-b border-gray-100 pb-3 mb-3">

              <span className="text-gray-600 text-sm font-medium w-12">
                From
              </span>

              <div className="bg-[#F4F5F6] px-3 py-1.5 rounded-lg text-sm text-gray-800 flex items-center justify-between w-64">

                <span>{session.user?.email}</span>

                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>

              </div>

            </div>

            <div className="flex items-center gap-6 border-b border-gray-100 pb-3 mb-3">

              <span className="text-gray-600 text-sm font-medium w-12">
                To
              </span>

              <div className="flex-1 flex items-center gap-2 flex-wrap">

                <input
                  className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-300 text-sm"
                  placeholder="recipient@example.com, paste CSV..."
                  value={recipients.join(', ')}
                  onChange={(e) =>
                    setRecipients(
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                />

              </div>

              <label className="text-[#00B752] text-sm flex items-center gap-2 cursor-pointer hover:text-green-600 font-medium whitespace-nowrap">

                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>

                Upload List

                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvUpload}
                />

              </label>

            </div>

            <div className="flex items-center gap-6 border-b border-gray-100 pb-3 mb-6">

              <span className="text-gray-600 text-sm font-medium w-12">
                Subject
              </span>

              <input
                className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-300 text-sm"
                placeholder="Subject"
                value={subject}
                onChange={(e) =>
                  setSubject(e.target.value)
                }
              />

            </div>

            <div className="flex items-center gap-8 mb-6">

              <div className="flex items-center gap-3">

                <span className="text-gray-600 text-sm font-medium">
                  Delay between 2 emails
                </span>

                <input
                  type="number"
                  className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-800 outline-none text-center text-sm"
                  placeholder="00"
                  value={delaySecs}
                  onChange={(e) =>
                    setDelaySecs(e.target.value)
                  }
                />

              </div>

              <div className="flex items-center gap-3">

                <span className="text-gray-600 text-sm font-medium">
                  Hourly Limit
                </span>

                <input
                  type="number"
                  className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-800 outline-none text-center text-sm"
                  placeholder="00"
                  value={hourlyLimit}
                  onChange={(e) =>
                    setHourlyLimit(e.target.value)
                  }
                />

              </div>

            </div>

            <div className="flex-1 bg-[#FAFAFA] rounded-xl flex flex-col overflow-hidden border border-gray-100">

              <div className="px-4 py-3 bg-[#FAFAFA] flex items-center gap-4 text-gray-400 border-b border-gray-100">

                <button className="hover:text-gray-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>

                <div className="w-px h-4 bg-gray-200"></div>

                <button className="hover:text-gray-600 font-serif">
                  T<span className="text-xs">T</span>
                </button>

                <div className="w-px h-4 bg-gray-200"></div>

                <button className="hover:text-gray-600 font-bold font-serif">
                  B
                </button>

                <button className="hover:text-gray-600 italic font-serif">
                  I
                </button>

                <button className="hover:text-gray-600 underline font-serif">
                  U
                </button>

                <div className="w-px h-4 bg-gray-200"></div>

                <button className="hover:text-gray-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>

                <button className="hover:text-gray-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                    />
                  </svg>
                </button>

              </div>

              <textarea
                className="flex-1 w-full bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 resize-none p-4 text-sm"
                placeholder="Type Your Reply..."
                value={body}
                onChange={(e) =>
                  setBody(e.target.value)
                }
              />

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
