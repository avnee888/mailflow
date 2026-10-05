import { signIn, signOut, useSession } from 'next-auth/react';

export function Header() {
  const { data: session } = useSession();
  if (!session) return null;

  return (
    <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
      <h1 className="text-2xl font-semibold tracking-tight text-white/90">ReachInbox Scheduler</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
          {session.user?.image && <img src={session.user.image} alt="Avatar" className="w-7 h-7 rounded-full opacity-90" />}
          <span className="font-medium text-sm text-white/80">{session.user?.name}</span>
        </div>
        <button onClick={() => signOut()} className="text-red-400/90 text-sm border border-red-500/30 hover:bg-red-500/10 px-4 py-2 rounded-full transition-all">Logout</button>
      </div>
    </div>
  );
}
