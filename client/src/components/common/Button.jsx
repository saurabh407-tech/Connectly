import { Loader2 } from 'lucide-react';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const variants = {
  primary: 'bg-lagoon-400 text-ink-900 hover:bg-lagoon-300',
  secondary: 'border border-ink-600 bg-ink-800 text-slate-100 hover:bg-ink-700',
  ghost: 'text-slate-300 hover:bg-ink-700 hover:text-white',
};

const sizes = {
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

// Use for <Link> elements that should look like buttons
export const buttonClasses = ({ variant = 'primary', size = 'md', className = '' } = {}) =>
  `${base} ${variants[variant]} ${sizes[size]} ${className}`;

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={buttonClasses({ variant, size, className })}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
