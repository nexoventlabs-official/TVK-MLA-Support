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
  Home,
  Users,
  Hash,
  Database,
  ExternalLink,
} from 'lucide-react';
import api from '../api';

const STATUS_COLORS = {
  new: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  in_progress: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
  resolved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  rejected: 'bg-brand-100 text-brand-600 ring-1 ring-brand-200',
};

function fmtDateTime(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  return x.toLocaleString();
}

export default function VoterDetail() {
  const { id } = useParams();
  const [data, setData] = useState({ voter: null, member: null, requests: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
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
  const member = data.member;
  const display = v.name || '—';

  const relationLabel =
    v.relationType
      ? v.relationType.charAt(0).toUpperCase() + v.relationType.slice(1).toLowerCase()
      : 'Relation';

  const fields = [
    { label: 'Voter Name', value: v.name || '—', icon: User },
    { label: 'EPIC No', value: v.epicNo || '—', icon: IdCard, mono: true },
    { label: relationLabel, value: v.relationName || '—', icon: Users },
    { label: 'Gender', value: v.gender || '—', icon: User },
    { label: 'House No', value: v.houseNo || '—', icon: Home },
    {
      label: 'Mobile',
      value: v.mobile || '—',
      icon: Phone,
    },
    {
      label: 'Assembly',
      value:
        v.assemblyName && v.assemblyNo
          ? `${v.assemblyName} (${v.assemblyNo})`
          : v.assemblyName || v.assemblyNo || '—',
      icon: MapPin,
    },
    { label: 'Voter ID', value: v.voterId || '—', icon: Hash },
    { label: 'Source', value: v.sourceCollection || '—', icon: Database, mono: true },
  ];

  return (
    <div className="space-y-6">
      <Link to="/voters" className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-wide uppercase text-brand-500 hover:text-brand-900 transition">
        <ArrowLeft size={13} /> Back to voters
      </Link>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-medium">
            {display[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-brand-900">{display}</h1>
              {member?.isRegistered ? (
                <span className="pill bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 inline-flex items-center gap-1">
                  <ShieldCheck size={12} /> Registered TVK Member
                </span>
              ) : (
                <span className="pill bg-brand-100 text-brand-500 ring-1 ring-brand-200 inline-flex items-center gap-1">
                  <Database size={12} /> Voter Roll
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span className="inline-flex items-center gap-1 font-mono text-xs">
                <IdCard size={14} /> {v.epicNo || '—'}
              </span>
              {v.assemblyName && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} /> {v.assemblyName}
                  {v.assemblyNo ? ` (${v.assemblyNo})` : ''}
                </span>
              )}
              {v.mobile && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={14} /> {v.mobile}
                </span>
              )}
            </div>
            {member && (
              <div className="text-xs text-gray-500 mt-2">
                Registered on this WhatsApp number:{' '}
                <Link
                  to={`/members/${member._id}`}
                  className="text-brand-700 hover:underline inline-flex items-center gap-1"
                >
                  {member.phone} <ExternalLink size={12} />
                </Link>
                {member.registeredAt && (
                  <span className="ml-3">at {fmtDateTime(member.registeredAt)}</span>
                )}
              </div>
            )}
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
                    <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap w-48">
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

      {data.requests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-brand-900 mb-3">Service Requests</h2>
          <div className="space-y-3">
            {data.requests.map((r) => (
              <div key={r._id} className="card p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-brand-900">{r.optionTitle}</div>
                    <span className="pill bg-brand-50 text-brand-700 ring-1 ring-brand-200">{r.serviceTitle}</span>
                    <span
                      className={`pill ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-700'}`}
                    >
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
