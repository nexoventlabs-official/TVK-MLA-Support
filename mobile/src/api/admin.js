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

// Build a multipart payload for the campaign template builder. `mediaFile`
// is an Expo ImagePicker / DocumentPicker asset { uri, name, type } or null.
const buildCampaignFormData = (payload, mediaFile) => {
  const fd = new FormData();
  fd.append('name', payload.name || '');
  fd.append('language', payload.language || 'en_US');
  fd.append('category', payload.category || 'MARKETING');
  fd.append('headerType', payload.headerType || 'NONE');
  fd.append('headerText', payload.headerText || '');
  fd.append('bodyText', payload.bodyText || '');
  fd.append('footerText', payload.footerText || '');
  fd.append('buttons', JSON.stringify(payload.buttons || []));
  if (mediaFile) {
    fd.append('mediaFile', {
      uri: mediaFile.uri,
      name: mediaFile.name || 'upload',
      type: mediaFile.type || 'application/octet-stream',
    });
  }
  return fd;
};

export const createCampaign = (payload, mediaFile) =>
  client
    .post('/campaigns', buildCampaignFormData(payload, mediaFile), {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })
    .then((r) => r.data);

export const deleteCampaign = (id) =>
  client.delete(`/campaigns/${id}`).then((r) => r.data);

export const sendCampaign = (id) =>
  client.post(`/campaigns/${id}/send`).then((r) => r.data);

// Ask backend to reconcile template statuses with Meta. Mirrors the web
// frontend's silent 60s sync — gives us "live" approval status on mobile.
export const syncCampaigns = () =>
  client.post('/campaigns/sync').then((r) => r.data);

export const getAdminEvents = () =>
  client.get('/events').then((r) => r.data);

const buildEventFormData = (payload, imageFile) => {
  const fd = new FormData();
  fd.append('title', payload.title || '');
  fd.append('description', payload.description || '');
  fd.append('location', payload.location || '');
  fd.append('fromDate', payload.fromDate || '');
  fd.append('toDate', payload.toDate || '');
  fd.append('active', String(payload.active ?? true));
  if (imageFile) {
    fd.append('image', {
      uri: imageFile.uri,
      name: imageFile.name || 'event.jpg',
      type: imageFile.type || 'image/jpeg',
    });
  }
  return fd;
};

export const createEvent = (payload, imageFile) =>
  client
    .post('/events', buildEventFormData(payload, imageFile), {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })
    .then((r) => r.data);

export const updateEvent = (id, payload, imageFile) =>
  client
    .put(`/events/${id}`, buildEventFormData(payload, imageFile), {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })
    .then((r) => r.data);

export const deleteEvent = (id) =>
  client.delete(`/events/${id}`).then((r) => r.data);

export const getFlowImages = () =>
  client.get('/flow-images').then((r) => r.data);

// Push token registration — called from both admin & user roles.
export const registerPushToken = (token, role) =>
  client.post('/auth/push-token', { token, role }).then((r) => r.data).catch(() => null);
