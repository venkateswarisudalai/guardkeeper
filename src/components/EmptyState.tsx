import type { ReactNode } from 'react';

export function EmptyState({ icon, title, body, action }: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card p-10 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-xl bg-ink-100 text-ink-500 grid place-items-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {body && <p className="text-sm text-ink-500 mt-1.5 max-w-sm">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
