
import { Merchant, OperationStatus, WorkingHour, IFoodCredentials, IFoodEvent } from '../types';

const BASE_URL = 'https://merchant-api.ifood.com.br';

export const saveCredentials = (creds: IFoodCredentials) => {
  localStorage.setItem('ifood_creds', JSON.stringify(creds));
};

export const getCredentials = (): IFoodCredentials | null => {
  const data = localStorage.getItem('ifood_creds');
  return data ? JSON.parse(data) : null;
};

export const clearCredentials = () => {
  localStorage.removeItem('ifood_creds');
  localStorage.removeItem('ifood_token');
};

const getAccessToken = async (creds: IFoodCredentials): Promise<string> => {
  const cachedToken = localStorage.getItem('ifood_token');
  if (cachedToken) {
    const { token, expiry } = JSON.parse(cachedToken);
    if (Date.now() < expiry) return token;
  }

  const params = new URLSearchParams();
  params.append('grantType', 'client_credentials');
  params.append('clientId', creds.clientId);
  params.append('clientSecret', creds.clientSecret);

  const response = await fetch(`${BASE_URL}/authentication/v1.0/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) throw new Error('Authentication failed');
  
  const data = await response.json();
  localStorage.setItem('ifood_token', JSON.stringify({
    token: data.accessToken,
    expiry: Date.now() + (data.expiresIn * 1000) - 60000 
  }));

  return data.accessToken;
};

/**
 * MANDATORY FOR HOMOLOGATION: Polling Events
 * iFood requires you to poll for new events constantly during certification.
 */
export const pollEvents = async (): Promise<IFoodEvent[]> => {
  const creds = getCredentials();
  if (!creds) return [];
  const token = await getAccessToken(creds);

  const response = await fetch(`${BASE_URL}/order/v1.0/events:polling`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (response.status === 204) return []; // No content
  if (!response.ok) throw new Error('Polling failed');
  
  return await response.json();
};

/**
 * MANDATORY FOR HOMOLOGATION: Acknowledging Events
 */
export const acknowledgeEvents = async (eventIds: string[]): Promise<void> => {
  const creds = getCredentials();
  if (!creds) return;
  const token = await getAccessToken(creds);

  const response = await fetch(`${BASE_URL}/order/v1.0/events/acknowledgment`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventIds.map(id => ({ id })))
  });

  if (!response.ok) throw new Error('Acknowledgment failed');
};

export const getMerchants = async (): Promise<Merchant[]> => {
  const creds = getCredentials();
  if (!creds) return [];

  try {
    const token = await getAccessToken(creds);
    const response = await fetch(`${BASE_URL}/merchant/v1.0/merchants`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch merchants');
    const merchantsData = await response.json();

    const detailedMerchants = await Promise.all(merchantsData.map(async (m: any) => {
      const statusRes = await fetch(`${BASE_URL}/merchant/v1.0/merchants/${m.id}/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statusData = await statusRes.json();
      
      let status = OperationStatus.CLOSED;
      // iFood status can have multiple entries
      const mainStatus = statusData[0]?.operation || 'CLOSED';
      if (mainStatus === 'AVAILABLE') status = OperationStatus.OPEN;
      if (mainStatus === 'TOGGLED_OFF') status = OperationStatus.PAUSED;

      return {
        id: m.id,
        name: m.name,
        status: status,
        expectedStatus: OperationStatus.OPEN,
        lastUpdated: new Date().toISOString(),
        address: 'Real Merchant Address',
        hours: []
      };
    }));

    return detailedMerchants;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const updateWorkingHours = async (id: string, hours: WorkingHour[]): Promise<boolean> => {
  return true;
};

export const schedulePause = async (id: string, durationMinutes: number, reason: string): Promise<boolean> => {
  return true;
};
