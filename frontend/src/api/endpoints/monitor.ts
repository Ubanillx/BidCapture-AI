import { request } from '../client';
import type {
  ApiMessage,
  AppConfig,
  BidResult,
  Contact,
  CustomSite,
  LogsResponse,
  ResultDetail,
  ResultsResponse,
  Site,
  StatusResponse,
} from '../types/monitor';

export function getStatus() {
  return request<Partial<StatusResponse>>('/api/status');
}

export function getLogs(limit = 120) {
  return request<LogsResponse>(`/api/logs?limit=${limit}`);
}

export function clearLogs() {
  return request<ApiMessage>('/api/logs', { method: 'DELETE' });
}

export function getResults(limit = 100) {
  return request<ResultsResponse>(`/api/results?limit=${limit}`);
}

export function getResultDetail(record: Pick<BidResult, 'id'>) {
  return request<ResultDetail>(`/api/results/${encodeURIComponent(record.id)}`);
}

export function getConfig() {
  return request<Partial<AppConfig>>('/api/config');
}

export function saveConfig(config: Partial<AppConfig>) {
  return request<ApiMessage>('/api/config', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export function saveFullConfig(config: AppConfig) {
  return request<ApiMessage>('/api/config/full', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export function getSites() {
  return request<Site[]>('/api/sites');
}

export function saveEnabledSites(enabledSites: string[]) {
  return request<ApiMessage>('/api/sites', {
    method: 'POST',
    body: JSON.stringify(enabledSites),
  });
}

export function getCustomSites() {
  return request<CustomSite[]>('/api/custom-sites');
}

export function saveCustomSites(customSites: CustomSite[]) {
  return request<ApiMessage>('/api/custom-sites', {
    method: 'POST',
    body: JSON.stringify(customSites),
  });
}

export function getContacts() {
  return request<Contact[]>('/api/contacts');
}

export function saveContacts(contacts: Contact[]) {
  return request<ApiMessage>('/api/contacts', {
    method: 'POST',
    body: JSON.stringify(contacts),
  });
}

export function startMonitor() {
  return request<ApiMessage>('/api/start', { method: 'POST' });
}

export function stopMonitor() {
  return request<ApiMessage>('/api/stop', { method: 'POST' });
}

export function runOnce() {
  return request<ApiMessage>('/api/run-once', { method: 'POST' });
}

export function testEndpoint(path: string, payload: Record<string, unknown>) {
  return request<ApiMessage>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
