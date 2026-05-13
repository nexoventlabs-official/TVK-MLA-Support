// Citizen-portal endpoints — anything under /api/portal/* that isn't auth.
import client from './client';

export const getServices = () =>
  client.get('/portal/services').then((r) => r.data);

export const getPortalStats = () =>
  client.get('/portal/stats').then((r) => r.data);

export const getEvents = () =>
  client.get('/portal/events').then((r) => r.data);

export const getEvent = (id) =>
  client.get(`/portal/events/${id}`).then((r) => r.data);

export const getMyGrievances = () =>
  client.get('/portal/grievances').then((r) => r.data);

export const getMyGrievance = (ticketId) =>
  client.get(`/portal/grievances/${ticketId}`).then((r) => r.data);

// Create grievance with an optional image. Pass `image` as a
// { uri, name, type } object built from expo-image-picker results.
export const createGrievance = async (payload, image) => {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
  });
  if (image?.uri) {
    fd.append('image', {
      uri: image.uri,
      name: image.name || `grievance-${Date.now()}.jpg`,
      type: image.type || 'image/jpeg',
    });
  }
  const res = await client.post('/portal/grievances', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
