
export enum OperationStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PAUSED = 'PAUSED'
}

export interface WorkingHour {
  dayOfWeek: string;
  open: string; // HH:mm
  close: string; // HH:mm
}

export interface Merchant {
  id: string;
  name: string;
  status: OperationStatus;
  lastUpdated: string;
  expectedStatus: OperationStatus;
  hours: WorkingHour[];
  address: string;
}

export interface AnomalyReport {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  reason: string;
  recommendation: string;
}

export interface IFoodCredentials {
  clientId: string;
  clientSecret: string;
}

export interface IFoodEvent {
  id: string;
  code: string;
  fullCode: string;
  merchantId: string;
  createdAt: string;
}

export interface CertificationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'success' | 'error';
  lastResponse?: string;
}
