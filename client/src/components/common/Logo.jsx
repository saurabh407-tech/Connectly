import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

export default function Logo({ to = '/', className = '' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-lagoon-400 text-ink-900">
        <MessageCircle size={20} strokeWidth={2.5} />
      </span>
      <span className="text-xl font-extrabold tracking-tight text-white">Connectly</span>
    </Link>
  );
}
