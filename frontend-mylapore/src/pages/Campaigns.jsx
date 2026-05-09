import { useEffect, useState } from 'react';
import {
  Plus, Trash2, X, Send, RefreshCw, Image as ImageIcon, Video, FileText,
  Type as TypeIcon, MessageSquare, Phone, Link as LinkIcon, Reply,
} from 'lucide-react';
import api from '../api';

const STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  DRAFT: 'bg-gray-200 text-gray-700',
  PAUSED: 'bg-gray-200 text-gray-700',
  DISABLED: 'bg-gray-200 text-gray-700',
  IN_APPEAL: 'bg-blue-100 text-blue-700',
};

const blank = {
  name: '',
  language: 'en_US',
  category: 'MARKETING',
  headerType: 'NONE',
  headerText: '',
  bodyText: '',
  footerText: '',
  buttons: [],
  mediaFile: null,
};

export default function Campaigns() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/campaigns');
      setItems(data.campaigns);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000); // auto-refresh template status
    return () => clearInterval(t);
  }, []);

  const sync = async () => {
    setSyncing(true);
    try {
      await api.post('/campaigns/sync');
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !/^[a-z0-9_]+$/.test(form.name)) {
      alert('Name must be lower_snake_case (a-z, 0-9, _).');
      return;
    }
    if (!form.bodyText.trim()) {
      alert('Body text is required.');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('language', form.language);
      fd.append('category', form.category);
      fd.append('headerType', form.headerType);
      fd.append('headerText', form.headerText);
      fd.append('bodyText', form.bodyText);
      fd.append('footerText', form.footerText);
      fd.append('buttons', JSON.stringify(form.buttons));
      if (form.mediaFile) fd.append('mediaFile', form.mediaFile);

      const { data } = await api.post('/campaigns', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowForm(false);
      setForm(blank);
      await load();
      const c = data.campaign;
      if (c.status === 'REJECTED') {
        alert(`Template was rejected:\n${c.rejectionReason || 'unknown reason'}`);
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this template (also from Meta)?')) return;
    await api.delete(`/campaigns/${id}`);
    load();
  };

  const send = async (id) => {
    if (!confirm('Send this template to all members?')) return;
    setSending(id);
    try {
      const { data } = await api.post(`/campaigns/${id}/send`);
      alert(`Sent: ${data.success} • Failed: ${data.failed} • Total: ${data.total}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSending(null);
    }
  };

  const addButton = (type) => {
    if (form.buttons.length >= 10) return;
    setForm({
      ...form,
      buttons: [...form.buttons, { type, text: '', url: '', phone_number: '' }],
    });
  };

  const updateButton = (idx, patch) => {
    const next = form.buttons.slice();
    next[idx] = { ...next[idx], ...patch };
    setForm({ ...form, buttons: next });
  };

  const removeButton = (idx) => {
    setForm({ ...form, buttons: form.buttons.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Campaigns</h1>
          <p className="text-sm text-gray-600">Build WhatsApp templates, submit to Meta, and broadcast to all members.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={sync} disabled={syncing} className="btn-secondary !py-1.5 !text-xs">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Sync status
          </button>
          <button onClick={() => { setForm(blank); setShowForm(true); }} className="btn-primary">
            <Plus size={16} /> New Template
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          No templates yet. Click <strong>New Template</strong> to create one.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <div key={c._id} className="card overflow-hidden flex flex-col">
              {c.headerType === 'IMAGE' && c.headerMediaUrl ? (
                <img src={c.headerMediaUrl} alt="" className="w-full h-32 object-cover" />
              ) : c.headerType === 'VIDEO' && c.headerMediaUrl ? (
                <video src={c.headerMediaUrl} className="w-full h-32 object-cover bg-black" muted />
              ) : c.headerType === 'TEXT' ? (
                <div className="px-4 pt-4 font-semibold text-brand-900 line-clamp-2">{c.headerText}</div>
              ) : null}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-brand-900 truncate">{c.name}</div>
                  <span className={`pill ${STATUS_COLORS[c.status] || 'bg-gray-200 text-gray-700'}`}>{c.status}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{c.category} • {c.language}</div>
                <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap line-clamp-4">{c.bodyText}</p>
                {c.footerText && <div className="text-xs text-gray-500 mt-2 italic">{c.footerText}</div>}
                {c.buttons?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {c.buttons.map((b, i) => (
                      <span key={i} className="pill bg-gray-100 text-gray-700">
                        {b.type === 'URL' && <LinkIcon size={11} />}
                        {b.type === 'PHONE_NUMBER' && <Phone size={11} />}
                        {b.type === 'QUICK_REPLY' && <Reply size={11} />}
                        {b.text}
                      </span>
                    ))}
                  </div>
                )}
                {c.rejectionReason && (
                  <div className="text-xs text-red-600 mt-2 bg-red-50 px-2 py-1 rounded">
                    {c.rejectionReason}
                  </div>
                )}
                {c.sends?.length > 0 && (
                  <div className="text-xs text-gray-500 mt-2">
                    Last sent: {new Date(c.sends.at(-1).sentAt).toLocaleString()} • {c.sends.at(-1).success}/{c.sends.at(-1).total} ok
                  </div>
                )}
                <div className="mt-auto pt-3 flex gap-2">
                  <button
                    onClick={() => send(c._id)}
                    className="btn-primary !py-1.5 flex-1 !text-xs"
                    disabled={c.status !== 'APPROVED' || sending === c._id}
                  >
                    {sending === c._id ? 'Sending…' : <><Send size={14} /> Send</>}
                  </button>
                  <button onClick={() => remove(c._id)} className="btn-danger !py-1.5 !text-xs">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={submit} className="card w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="font-semibold text-brand-800">New WhatsApp Template</div>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Template Name *</label>
                  <input
                    className="input"
                    placeholder="lower_snake_case_only"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Language</label>
                  <select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                    <option value="en_US">English (en_US)</option>
                    <option value="en">English (en)</option>
                    <option value="ta">Tamil (ta)</option>
                    <option value="hi">Hindi (hi)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="MARKETING">MARKETING</option>
                  <option value="UTILITY">UTILITY</option>
                  <option value="AUTHENTICATION">AUTHENTICATION</option>
                </select>
              </div>

              <div>
                <label className="label">Header</label>
                <div className="grid grid-cols-5 gap-2">
                  {['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setForm({ ...form, headerType: h, mediaFile: null })}
                      className={`px-2 py-2 rounded-lg border text-xs font-medium transition ${
                        form.headerType === h
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {h === 'NONE' && '—'}
                      {h === 'TEXT' && <TypeIcon size={14} className="inline mr-1" />}
                      {h === 'IMAGE' && <ImageIcon size={14} className="inline mr-1" />}
                      {h === 'VIDEO' && <Video size={14} className="inline mr-1" />}
                      {h === 'DOCUMENT' && <FileText size={14} className="inline mr-1" />}
                      {h !== 'NONE' && h.charAt(0) + h.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                {form.headerType === 'TEXT' && (
                  <input
                    className="input mt-2"
                    placeholder="Header text (max 60 chars)"
                    maxLength={60}
                    value={form.headerText}
                    onChange={(e) => setForm({ ...form, headerText: e.target.value })}
                  />
                )}

                {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(form.headerType) && (
                  <input
                    type="file"
                    className="input mt-2"
                    accept={
                      form.headerType === 'IMAGE'
                        ? 'image/*'
                        : form.headerType === 'VIDEO'
                        ? 'video/*'
                        : 'application/pdf'
                    }
                    onChange={(e) => setForm({ ...form, mediaFile: e.target.files?.[0] || null })}
                  />
                )}
              </div>

              <div>
                <label className="label">Body * (1024 chars max)</label>
                <textarea
                  rows={5}
                  className="input"
                  maxLength={1024}
                  value={form.bodyText}
                  onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
                  placeholder="Message body shown to your members."
                  required
                />
              </div>

              <div>
                <label className="label">Footer (optional, 60 chars max)</label>
                <input
                  className="input"
                  maxLength={60}
                  value={form.footerText}
                  onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label !mb-0">Buttons (max 10)</label>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => addButton('QUICK_REPLY')} className="btn-secondary !py-1 !text-xs">
                      <Reply size={12} /> Reply
                    </button>
                    <button type="button" onClick={() => addButton('URL')} className="btn-secondary !py-1 !text-xs">
                      <LinkIcon size={12} /> URL CTA
                    </button>
                    <button type="button" onClick={() => addButton('PHONE_NUMBER')} className="btn-secondary !py-1 !text-xs">
                      <Phone size={12} /> Call CTA
                    </button>
                  </div>
                </div>

                {form.buttons.length === 0 && (
                  <div className="text-xs text-gray-500">No buttons. Add up to 10 — reply / URL CTA / phone CTA.</div>
                )}

                <div className="space-y-2">
                  {form.buttons.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                      <span className="pill bg-white border border-gray-200 text-gray-700">{b.type === 'PHONE_NUMBER' ? 'CALL' : b.type === 'URL' ? 'URL' : 'REPLY'}</span>
                      <input
                        className="input !py-1 flex-1"
                        placeholder="Button text (max 25)"
                        maxLength={25}
                        value={b.text}
                        onChange={(e) => updateButton(i, { text: e.target.value })}
                      />
                      {b.type === 'URL' && (
                        <input
                          className="input !py-1 flex-1"
                          placeholder="https://..."
                          value={b.url}
                          onChange={(e) => updateButton(i, { url: e.target.value })}
                        />
                      )}
                      {b.type === 'PHONE_NUMBER' && (
                        <input
                          className="input !py-1 flex-1"
                          placeholder="+919999999999"
                          value={b.phone_number}
                          onChange={(e) => updateButton(i, { phone_number: e.target.value })}
                        />
                      )}
                      <button type="button" onClick={() => removeButton(i)} className="text-red-600 p-1 hover:bg-red-50 rounded">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg p-3">
                After creation the template is submitted to Meta and shows as <strong>PENDING</strong>. Approval typically takes a few minutes — once status is <strong>APPROVED</strong>, click <MessageSquare size={11} className="inline" /> Send to broadcast to all members.
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Submitting to Meta…' : 'Submit to Meta'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
