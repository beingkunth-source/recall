interface StatusBadgeProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

const statusConfig: Record<
  StatusBadgeProps['status'],
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100/80 text-amber-700',
  },
  processing: {
    label: 'Processing',
    className: 'bg-sky-100/80 text-sky-700 animate-pulse',
  },
  completed: {
    label: 'Indexed',
    className: 'bg-emerald-100/80 text-emerald-700',
  },
  failed: {
    label: 'Failed',
    className: 'bg-rose-100/80 text-rose-700',
  },
};

function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold leading-4 tracking-tight ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export default StatusBadge;
