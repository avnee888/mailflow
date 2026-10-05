import { signIn, signOut, useSession } from 'next-auth/react';

export function Header() {
  const { data: session } = useSession();
  if (!session) return null;

  return (
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
  );
}
