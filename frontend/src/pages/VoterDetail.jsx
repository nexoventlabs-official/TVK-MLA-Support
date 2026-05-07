import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  IdCard,
  ShieldCheck,
  Calendar,
  MapPin,
  User,
  Mail,
  Home,
  Users,
} from 'lucide-react';
import api from '../api';

const STATUS_COLORS = {
  new: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-200 text-gray-700',
};

function fmtDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  return x.toLocaleDateString();
}

function fmtDateTime(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  return x.toLocaleString();
}

export default function VoterDetail() {
  const { id } = useParams();
  const [data, setData] = useState({ voter: null, requests: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/voters/${id}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="card p-8 text-center text-gray-500">Loading…</div>;
  if (error || !data.voter) {
    return (
      <div className="card p-8 text-center text-gray-500">
        {error || 'Voter not found.'}
      </div>
    );
  }

  const v = data.voter;
  const snap = v.voterSnapshot || {};
  const display = v.name || v.profileName || '—';
  const isEpic = v.registrationType === 'epic';

  const fields = [
    { label: 'Voter Name', value: snap.name || v.name || '—', icon: User },
    { label: 'EPIC No', value: v.epicNo || snap.epicNo || '—', icon: IdCard, mono: true },
    {
      label: snap.relationType
        ? snap.relationType.charAt(0).toUpperCase() + snap.relationType.slice(1).toLowerCase()
        : 'Relation',
      value: snap.relationName || '—',
      icon: Users,
    },
    { label: 'Gender', value: v.gender || snap.gender || '—', icon: User },
    {
      label: 'Date of Birth',
      value: v.dob ? `${fmtDate(v.dob)}${v.age != null ? ` (${v.age} yrs)` : ''}` : '—',
      icon: Calendar,
    },
    { label: 'House No', value: snap.houseNo || '—', icon: Home },
    {
      label: 'Assembly',
      value:
        snap.assemblyName && snap.assemblyNo
          ? `${snap.assemblyName} (${snap.assemblyNo})`
          : snap.assemblyName || snap.assemblyNo || '—',
      icon: MapPin,
    },
    { label: 'Email', value: v.email || '—', icon: Mail },
  ];

  return (
    <div className="space-y-6">
      <Link to="/voters" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ArrowLeft size={14} /> Back to voters
      </Link>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-medium">
            {display[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-brand-900">{display}</h1>
              <span
                className={`pill ${
                  isEpic
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                } inline-flex items-center gap-1`}
              >
                <ShieldCheck size={12} /> {isEpic ? 'EPIC Verified' : 'Manual Registration'}
              </span>
            </div>
            <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span className="inline-flex items-center gap-1">
                <Phone size={14} /> {v.phone}
              </span>
              {v.profileName && (
                <span className="text-gray-400">WhatsApp profile: {v.profileName}</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-4">
              <span>Registered: {fmtDateTime(v.registeredAt)}</span>
              <span>First seen: {fmtDateTime(v.firstSeenAt)}</span>
              <span>Requests: <strong>{v.requestCount || data.requests.length}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-brand-900 mb-4">Voter Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {fields.map((f) => {
                const Icon = f.icon;
                return (
                  <tr key={f.label}>
                    <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <Icon size={14} /> {f.label}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 text-gray-800 ${f.mono ? 'font-mono text-xs' : ''}`}
                    >
                      {f.value}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                    <span className="pill bg-brand-50 text-brand-700">{r.serviceTitle}</span>
                    <span className={`pill ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-700'}`}>
                      {String(r.status || '').replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                    <Calendar size={12} /> {fmtDateTime(r.createdAt)}
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
