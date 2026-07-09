import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';

export async function getDocumentDownloadUrl(fileKey) {
  if (!fileKey) return null;
  return routeRequest({
    mockFn: async () => null,
    apiFn: async () => {
      const encoded = fileKey.split('/').map(encodeURIComponent).join('/');
      const data = await api.get(`/documents/${encoded}/download`);
      return data?.downloadUrl || data?.url || null;
    },
  });
}
