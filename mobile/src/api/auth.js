import client from './client';

// Admin
export const adminLogin = (username, password) =>
  client.post('/auth/login', { username, password }).then((r) => r.data);

export const adminVerify = () =>
  client.get('/auth/verify').then((r) => r.data);

// Citizen (portal, OTP-based)
export const portalSendOtp = (phone, mode = 'login') =>
  client.post('/portal/auth/send-otp', { phone, mode }).then((r) => r.data);

export const portalVerifyOtp = (phone, otp) =>
  client.post('/portal/auth/verify-otp', { phone, otp }).then((r) => r.data);

export const portalRegister = (payload) =>
  client.post('/portal/auth/register', payload).then((r) => r.data);

export const portalMe = () =>
  client.get('/portal/auth/me').then((r) => r.data);
