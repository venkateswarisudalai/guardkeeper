import { initials } from '../lib/format';

const palette = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-indigo-100 text-indigo-700',
  'bg-fuchsia-100 text-fuchsia-700',
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const cls = palette[hash(name) % palette.length];
  return (
    <div
      className={`rounded-full grid place-items-center font-semibold ${cls}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name) || '?'}
    </div>
  );
}
