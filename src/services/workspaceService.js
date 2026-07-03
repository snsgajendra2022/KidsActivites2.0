import { api } from './api/client.js';

const PUBLIC_WORKSPACE_PREFIX = '/public/workspaces';

export async function checkWorkspaceSlug(slug) {
  return api.get('/workspaces/check-slug', { slug }, { auth: false, skipTenantHeader: true });
}

export async function checkPublicWorkspaceSlug(slug) {
  return api.post(`${PUBLIC_WORKSPACE_PREFIX}/check-slug`, { slug }, { auth: false, skipTenantHeader: true });
}

export async function createWorkspaceRequest(payload) {
  return api.post('/workspaces', payload, { auth: false, skipTenantHeader: true });
}

export async function registerSchool(payload) {
  return api.post(`${PUBLIC_WORKSPACE_PREFIX}/register`, payload, { auth: false, skipTenantHeader: true });
}

export async function confirmWorkspace(token) {
  return api.get('/workspaces/confirm', { token }, { auth: false, skipTenantHeader: true });
}

/** Generate a URL-safe slug from a workspace name. */
export function slugifyName(name) {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
}

/** Build tenant login URL for dev (subdomain) or prod. */
export function buildWorkspaceLoginUrl(slug) {
  if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
    return `http://${slug}.localhost:5173/login`;
  }
  return `https://${slug}.schoolbridge.com/login`;
}
