import { delay } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';

async function mockSubmitSupportTicket(payload) {
  await delay(500);
  return {
    ticketId: `TKT-DEMO-${Date.now()}`,
    message: 'Support request received. The school team will contact you shortly.',
    demo: true,
  };
}

export async function submitSupportTicket({ name, contact, message }) {
  return routeRequest({
    mockFn: () => mockSubmitSupportTicket({ name, contact, message }),
    apiFn: () => api.post('/support/tickets', { name, contact, message }, { auth: false }),
  });
}
