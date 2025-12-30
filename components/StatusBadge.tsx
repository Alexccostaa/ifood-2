
import React from 'react';
import { OperationStatus } from '../types';

interface Props {
  status: OperationStatus;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const configs = {
    [OperationStatus.OPEN]: {
      label: 'OPEN',
      text: 'text-green-600',
      dot: 'bg-green-500'
    },
    [OperationStatus.CLOSED]: {
      label: 'CLOSED',
      text: 'text-red-600',
      dot: 'bg-red-500'
    },
    [OperationStatus.PAUSED]: {
      label: 'PAUSED',
      text: 'text-yellow-600',
      dot: 'bg-yellow-500'
    }
  };

  const config = configs[status];

  return (
    <span className={`inline-flex items-center text-[10px] font-bold tracking-tighter ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} mr-1 animate-pulse`}></span>
      {config.label}
    </span>
  );
};
