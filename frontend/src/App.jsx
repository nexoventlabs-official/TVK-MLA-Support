import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from './api';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ServiceRequests from './pages/ServiceRequests.jsx';
import Members from './pages/Members.jsx';
import MemberDetail from './pages/MemberDetail.jsx';
import Voters from './pages/Voters.jsx';
import VoterDetail from './pages/VoterDetail.jsx';
import Campaigns from './pages/Campaigns.jsx';
import FlowImages from './pages/FlowImages.jsx';

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
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse text-brand-700">Loading…</div>
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
          <Route path="members" element={<Members />} />
          <Route path="members/:id" element={<MemberDetail />} />
          <Route path="voters" element={<Voters />} />
          <Route path="voters/:id" element={<VoterDetail />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="flow-images" element={<FlowImages />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
