import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, Calendar, MapPin, ShieldCheck, IdCard } from 'lucide-react';
import api from '../api';

const STATUS_COLORS = {
  new: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  in_progress: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
  resolved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  rejected: 'bg-brand-100 text-brand-600 ring-1 ring-brand-200',
};

export default function MemberDetail() {
  const { id } = useParams();
  const [data, setData] = useState({ member: null, requests: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/members/${id}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="card p-8 text-center text-gray-500">Loading…</div>;
  if (!data.member) return <div className="card p-8 text-center text-gray-500">Member not found.</div>;

  const m = data.member;
  const display = m.name || m.profileName || '—';

  return (
    <div className="space-y-6">
      <Link to="/members" className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-wide uppercase text-brand-500 hover:text-brand-900 transition">
        <ArrowLeft size={13} /> Back to members
      </Link>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-medium">
            {display[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-brand-900">{display}</h1>
              {m.isRegistered ? (
                m.registrationType === 'epic' && m.epicNo ? (
                  <Link
                    to={`/voters/${m.epicNo}`}
                    className="pill inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 hover:bg-emerald-100"
                  >
                    <ShieldCheck size={12} /> EPIC Verified
                  </Link>
                ) : (
                  <span className="pill inline-flex items-center gap-1 bg-amber-50 text-amber-700 ring-1 ring-amber-200/60">
                    <ShieldCheck size={12} /> Manual
                  </span>
                )
              ) : (
                <span className="pill bg-brand-100 text-brand-500 ring-1 ring-brand-200">Not registered</span>
              )}
            </div>
            <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span className="inline-flex items-center gap-1"><Phone size={14} /> {m.phone}</span>
              {m.profileName && <span className="text-gray-400">WhatsApp profile: {m.profileName}</span>}
              {m.email && <span>{m.email}</span>}
              {m.epicNo && (
                <span className="inline-flex items-center gap-1 font-mono text-xs">
                  <IdCard size={14} /> {m.epicNo}
                </span>
              )}
              {m.age != null && <span>Age: <strong>{m.age}</strong></span>}
              {m.gender && <span>{m.gender}</span>}
            </div>
            <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-4">
              <span>First seen: {new Date(m.firstSeenAt).toLocaleString()}</span>
              <span>Last seen: {new Date(m.lastSeenAt).toLocaleString()}</span>
              {m.registeredAt && (
                <span>Registered: {new Date(m.registeredAt).toLocaleString()}</span>
              )}
              <span>Messages: <strong>{m.messageCount || 0}</strong></span>
              <span>Requests: <strong>{m.requestCount || data.requests.length}</strong></span>
            </div>
            {m.lastMessage && (
              <div className="text-sm text-gray-600 mt-3 inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                <MessageCircle size={14} className="text-gray-400" /> {m.lastMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-brand-900 mb-3">Requests submitted</h2>
        {data.requests.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">No service requests submitted yet.</div>
        ) : (
          <div className="space-y-3">
            {data.requests.map((r) => (
              <div key={r._id} className="card p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-brand-900">{r.optionTitle}</div>
                    <span className="pill bg-brand-50 text-brand-700 ring-1 ring-brand-200">{r.serviceTitle}</span>
                    <span className={`pill ${STATUS_COLORS[r.status]}`}>{r.status.replace('_', ' ')}</span>
                  </div>
                  <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                    <Calendar size={12} /> {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
                {r.location && (
                  <div className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
                    <MapPin size={12} /> {r.location}
                  </div>
                )}
                <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{r.description}</p>
                {r.notes && (
                  <div className="text-xs text-gray-500 mt-2 bg-gray-50 px-2 py-1 rounded">
                    <strong>Note:</strong> {r.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
