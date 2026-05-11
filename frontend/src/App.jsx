import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from './api';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ServiceRequests from './pages/ServiceRequests.jsx';
import ServiceRequestDetail from './pages/ServiceRequestDetail.jsx';
import Members from './pages/Members.jsx';
import MemberDetail from './pages/MemberDetail.jsx';
import Voters from './pages/Voters.jsx';
import VoterDetail from './pages/VoterDetail.jsx';
import Campaigns from './pages/Campaigns.jsx';
import FlowImages from './pages/FlowImages.jsx';
import Events from './pages/Events.jsx';

function App() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tvk_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/verify')
      .then((r) => setAuth(r.data.user))
      .catch(() => localStorage.removeItem('tvk_token'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-brand-200 border-t-brand-900 animate-spin" />
          <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-brand-500">
            Loading Console
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={auth ? <Navigate to="/" replace /> : <Login setAuth={setAuth} />}
        />
        <Route
          path="/"
          element={auth ? <Layout user={auth} setAuth={setAuth} /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="service-requests" element={<ServiceRequests />} />
          <Route path="service-requests/:id" element={<ServiceRequestDetail />} />
          <Route path="members" element={<Members />} />
          <Route path="members/:id" element={<MemberDetail />} />
          <Route path="voters" element={<Voters />} />
          <Route path="voters/:id" element={<VoterDetail />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="events" element={<Events />} />
          <Route path="flow-images" element={<FlowImages />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
