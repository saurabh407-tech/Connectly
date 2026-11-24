import { useState, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Text input with optional leading icon, error message and built-in show/hide for passwords
export default function Input({ label, icon: Icon, error, type = 'text', className = '', ...props }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-[#41516F]">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7585A5]"
          />
        )}
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full rounded-2xl border bg-white/55 py-2.5 text-sm text-[#273653] shadow-[inset_3px_3px_8px_rgba(142,158,190,0.16),inset_-3px_-3px_8px_rgba(255,255,255,0.85)] placeholder:text-[#8793AA] transition duration-200 focus:border-blue-300 focus:bg-white/75 focus:outline-none focus:ring-4 focus:ring-blue-200/40 ${
            Icon ? 'pl-11' : 'pl-4'
          } ${isPassword ? 'pr-12' : 'pr-4'} ${error ? 'border-red-400/80' : 'border-white/75'}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#7585A5] transition hover:bg-blue-50 hover:text-blue-700"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
