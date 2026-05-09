import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Calendar, MapPin, Image as ImageIcon } from 'lucide-react';
import api from '../api';

const blank = {
  _id: null,
  title: '',
  description: '',
  location: '',
  fromDate: '',
  toDate: '',
  active: true,
  imageFile: null,
  image: '',
};

function toDateInput(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Events() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/events');
      setItems(data.events || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(blank);
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setForm({
      _id: ev._id,
      title: ev.title || '',
      description: ev.description || '',
      location: ev.location || '',
      fromDate: toDateInput(ev.fromDate),
      toDate: toDateInput(ev.toDate),
      active: !!ev.active,
      imageFile: null,
      image: ev.image || '',
    });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.fromDate || !form.toDate) {
      alert('Title, from date and to date are required.');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('location', form.location);
      fd.append('fromDate', form.fromDate);
      fd.append('toDate', form.toDate);
      fd.append('active', String(form.active));
      if (form.imageFile) fd.append('image', form.imageFile);

      if (form._id) {
        await api.put(`/events/${form._id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/events', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setShowForm(false);
      setForm(blank);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this event? It will be removed from the WhatsApp flow.')) return;
    await api.delete(`/events/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-brand-400 mb-2">
            Content
          </div>
          <h1 className="page-title">Upcoming Events</h1>
          <p className="page-subtitle">
            {items.length} events. These appear under <em>Upcoming Events</em> in the WhatsApp grievance flow.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={15} /> New Event
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          No events yet. Create one to surface it on WhatsApp.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((ev) => {
            const past = new Date(ev.toDate).getTime() < Date.now();
            return (
              <div key={ev._id} className="card overflow-hidden flex flex-col">
                <div className="aspect-[16/9] bg-gray-100 flex items-center justify-center">
                  {ev.image ? (
                    <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={42} className="text-gray-300" />
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-brand-900 flex-1 min-w-0 truncate">{ev.title}</h3>
                    {!ev.active && <span className="pill bg-brand-100 text-brand-600 ring-1 ring-brand-200">Hidden</span>}
                    {past && <span className="pill bg-amber-50 text-amber-700 ring-1 ring-amber-200/60">Past</span>}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} /> {formatDate(ev.fromDate)} – {formatDate(ev.toDate)}
                    </span>
                    {ev.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} /> {ev.location}
                      </span>
                    )}
                  </div>
                  {ev.description && (
                    <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">
                      {ev.description}
                    </p>
                  )}
                  <div className="mt-auto pt-2 flex gap-2">
                    <button onClick={() => openEdit(ev)} className="btn-secondary !py-1.5 !text-xs flex-1">
                      <Pencil size={14} /> Edit
                    </button>
                    <button onClick={() => remove(ev._id)} className="btn-danger !py-1.5 !text-xs">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <form
            onSubmit={submit}
            className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4 shadow-elevated border border-brand-200"
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold text-brand-900">
                {form._id ? 'Edit Event' : 'New Event'}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-500 text-sm"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Public meeting at Anna Salai"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">From</label>
                <input
                  type="date"
                  className="input"
                  value={form.fromDate}
                  onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">To</label>
                <input
                  type="date"
                  className="input"
                  value={form.toDate}
                  onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Location</label>
              <input
                className="input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Chennai"
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                rows={4}
                className="input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Event Image (banner)</label>
              <div className="flex items-center gap-3">
                {(form.imageFile || form.image) && (
                  <img
                    src={form.imageFile ? URL.createObjectURL(form.imageFile) : form.image}
                    alt="preview"
                    className="w-20 h-20 object-cover rounded-md border"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileRef}
                  className="hidden"
                  onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-secondary !text-xs"
                >
                  {form.imageFile || form.image ? 'Replace image' : 'Choose image'}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active (shown on WhatsApp)
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary !text-sm"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary !text-sm">
                {saving ? 'Saving…' : form._id ? 'Save' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
