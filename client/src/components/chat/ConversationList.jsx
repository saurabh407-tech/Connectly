
import { useState } from 'react';
import { Search, Users, AlertCircle } from 'lucide-react';

import Avatar from '../common/Avatar.jsx';
import useUserStore from '../../store/userStore.js';
import useConversationStore from '../../store/conversationStore.js';

export default function ConversationList({ onSelect }) {
  const users = useUserStore((state) => state.users);
  const loading = useUserStore((state) => state.loading);
  const error = useUserStore((state) => state.error);

  const conversations = useConversationStore((state) => state.conversations);

  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(null);

  const filteredUsers = users.filter((user) => {
    const query = search.toLowerCase().trim();

    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  const handleSelect = (user) => {
    setActiveId(user._id);
    onSelect?.(user);
  };

  const getConversation = (userId) =>
    conversations.find((conversation) =>
      conversation.participants?.some(
        (participant) => String(participant._id) === String(userId)
      )
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pb-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people by name or email"
            className="w-full rounded-xl border border-ink-600 bg-ink-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-lagoon-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="px-4 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          People ({users.length})
        </p>
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
          Loading people...
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
          <AlertCircle size={24} className="text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
          <Users size={30} className="text-slate-500" />
          <p className="text-sm font-medium text-white">
            No registered users yet
          </p>
        </div>
      )}

      {!loading && !error && users.length > 0 && filteredUsers.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-5 text-sm text-slate-400">
          No users found for "{search}"
        </div>
      )}

      {!loading && !error && filteredUsers.length > 0 && (
        <ul className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-2 pb-2">
          {filteredUsers.map((user) => {
            const conversation = getConversation(user._id);
            const unreadCount = conversation?.unreadCount || 0;

            return (
              <li key={user._id}>
                <button
                  type="button"
                  onClick={() => handleSelect(user)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-ink-700 ${
                    activeId === user._id ? 'bg-ink-700' : ''
                  }`}
                >
                  <Avatar
                    name={user.name}
                    src={user.avatar}
                    online={user.isOnline}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {user.name}
                    </p>

                    <p className="truncate text-xs text-slate-400">
                      {conversation?.lastMessage?.text ||
                        user.about ||
                        user.email}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {unreadCount > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-green-500 px-1.5 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}

                    <span
                      className={`h-2 w-2 rounded-full ${
                        user.isOnline ? 'bg-green-400' : 'bg-slate-600'
                      }`}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
