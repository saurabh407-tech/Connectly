const sizes = { sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-14 w-14 text-base' };

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export default function Avatar({ name, src, size = 'md', online = false }) {
  return (
    <span className="relative inline-block shrink-0">
      {src ? (
        <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover`} />
      ) : (
        <span
          className={`${sizes[size]} grid place-items-center rounded-full bg-ink-600 font-bold text-lagoon-300`}
        >
          {initials(name) || '?'}
        </span>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink-800 bg-lagoon-400" />
      )}
    </span>
  );
}
