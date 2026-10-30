interface StatusBadgeProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

const statusConfig: Record<
  StatusBadgeProps['status'],
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-700',
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-700',
  },
  completed: {
    label: 'Completed',
    className: 'bg-primary-100 text-primary-700',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700',
  },
};

function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium leading-4 ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export default StatusBadge;
