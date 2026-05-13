// Admin endpoints — anything that requires the admin JWT.
import client from './client';

export const getDashboardStats = () =>
  client.get('/dashboard/stats').then((r) => r.data);

export const getMembers = (params = {}) =>
  client.get('/members', { params }).then((r) => r.data);

export const getMember = (id) =>
  client.get(`/members/${id}`).then((r) => r.data);

export const getServiceCatalog = () =>
  client.get('/service-requests/catalog').then((r) => r.data);

export const getServiceRequests = (params = {}) =>
  client.get('/service-requests', { params }).then((r) => r.data);

export const getServiceRequest = (id) =>
  client.get(`/service-requests/${id}`).then((r) => r.data);

export const updateServiceRequest = (id, payload) =>
  client.patch(`/service-requests/${id}`, payload).then((r) => r.data);

export const getVoters = (params = {}) =>
  client.get('/voters', { params }).then((r) => r.data);

export const getVoter = (id) =>
  client.get(`/voters/${id}`).then((r) => r.data);

export const lookupVoterByEpic = (epic) =>
  client.get(`/voters/lookup/${encodeURIComponent(epic)}`).then((r) => r.data);

export const getCampaigns = () =>
  client.get('/campaigns').then((r) => r.data);

export const getAdminEvents = () =>
  client.get('/events').then((r) => r.data);

export const getFlowImages = () =>
  client.get('/flow-images').then((r) => r.data);

// Push token registration — called from both admin & user roles.
export const registerPushToken = (token, role) =>
  client.post('/auth/push-token', { token, role }).then((r) => r.data).catch(() => null);
