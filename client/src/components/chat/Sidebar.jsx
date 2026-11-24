
import { Plus } from 'lucide-react';

import Logo from '../common/Logo.jsx';
import UserProfileCard from './UserProfileCard.jsx';
import ConversationList from './ConversationList.jsx';

export default function Sidebar({ user, onLogout, onSelectUser, chatOpen }) {
  return (
    <aside className={`${chatOpen ? 'hidden md:flex' : 'flex'} h-full w-full flex-col border-r border-ink-600 bg-ink-800 md:w-80 lg:w-96`}>

      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <Logo to="/dashboard" />

        <button
          type="button"
          onClick={() => onSelectUser?.(null)}
          className="rounded-lg bg-ink-700 p-2 text-slate-300 transition hover:bg-ink-600 hover:text-white"
          aria-label="Clear selected conversation"
          title="New conversation"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Real registered users */}
      <ConversationList onSelect={onSelectUser} />

      {/* Logged-in user profile */}
      <div className="border-t border-ink-600 p-4">
        <UserProfileCard user={user} onLogout={onLogout} />
      </div>

    </aside>
  );
}
