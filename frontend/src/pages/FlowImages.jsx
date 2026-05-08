import { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  ExternalLink,
} from 'lucide-react';
import api from '../api';

// Ordered group labels. Groups not listed here are rendered at the bottom.
const GROUP_LABELS = [
  ['banners', 'Welcome Flow Banner'],
  ['chatbot', 'Chatbot Welcome Image'],
  ['main_menu', 'Main Menu Icons (6 tiles)'],
  ['cta_headers', 'Branch Headers (Contact MLA, Helplines, Social, Events)'],
  ['social', 'Social Media Icons'],
  ['service_icons', 'Service Selection Icons (9 services)'],
  ['sub_banners', 'Sub-Screen Banners (per service)'],
  ['issue_headers', 'Per-Issue Message Headers'],
  ['pdf_documents', 'PDF Documents (forms / applications)'],
];

function prettyOptionLabel(group) {
  if (!group.startsWith('options_')) return group;
  const id = group.slice('options_'.length);
  return `Options — ${id.replace(/_/g, ' ')}`;
}

export default function FlowImages() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState(null);
  const [openGroups, setOpenGroups] = useState({});
  const inputs = useRef({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/flow-images');
      setItems(data.images);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onPick = (key) => inputs.current[key]?.click();

  const onUpload = async (key, file) => {
    if (!file) return;
    setUploadingKey(key);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.post(`/flow-images/${key}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await load();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setUploadingKey(null);
    }
  };

  const onClear = async (key) => {
    if (!confirm('Remove this file?')) return;
    await api.delete(`/flow-images/${key}`);
    load();
  };

  const groups = items.reduce((acc, it) => {
    (acc[it.group] = acc[it.group] || []).push(it);
    return acc;
  }, {});

  const renderGroup = (gkey, label, defaultOpen = true) => {
    const group = groups[gkey] || [];
    if (!group.length) return null;
    const open = openGroups[gkey] ?? defaultOpen;
    const isPdf = gkey === 'pdf_documents';
    return (
      <div key={gkey} className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenGroups({ ...openGroups, [gkey]: !open })}
          className="w-full px-5 py-3 bg-brand-50 border-b border-brand-100 font-semibold text-brand-800 flex items-center justify-between"
        >
          <span>
            {label}{' '}
            <span className="text-xs text-brand-600 ml-2">
              {group.length} slot{group.length === 1 ? '' : 's'}
            </span>
          </span>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {open && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {group.map((item) => (
              <div key={item.key} className="border border-gray-200 rounded-lg p-3 flex flex-col">
                <div className="aspect-square bg-gray-50 rounded-md overflow-hidden flex items-center justify-center mb-2">
                  {isPdf ? (
                    item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center justify-center gap-1 text-brand-700 hover:text-brand-900"
                      >
                        <FileText size={42} />
                        <span className="text-xs inline-flex items-center gap-1">
                          Open PDF <ExternalLink size={10} />
                        </span>
                      </a>
                    ) : (
                      <FileText size={42} className="text-gray-300" />
                    )
                  ) : item.url ? (
                    <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={36} className="text-gray-300" />
                  )}
                </div>
                <div className="text-sm font-medium text-gray-800 line-clamp-2">{item.label}</div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">key: {item.key}</div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="file"
                    accept={isPdf ? 'application/pdf' : 'image/*'}
                    ref={(el) => (inputs.current[item.key] = el)}
                    className="hidden"
                    onChange={(e) => onUpload(item.key, e.target.files?.[0])}
                  />
                  <button
                    onClick={() => onPick(item.key)}
                    disabled={uploadingKey === item.key}
                    className="btn-primary !py-1.5 flex-1 !text-xs"
                  >
                    {uploadingKey === item.key ? (
                      'Uploading…'
                    ) : (
                      <>
                        <Upload size={14} /> {item.url ? 'Replace' : 'Upload'}
                      </>
                    )}
                  </button>
                  {item.url && (
                    <button onClick={() => onClear(item.key)} className="btn-danger !py-1.5 !text-xs">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {item.url && (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-700">
                    <CheckCircle2 size={12} /> Uploaded
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const knownGroupKeys = GROUP_LABELS.map(([k]) => k);
  const optionGroupKeys = Object.keys(groups).filter((k) => k.startsWith('options_'));
  const extraGroupKeys = Object.keys(groups).filter(
    (k) => !knownGroupKeys.includes(k) && !k.startsWith('options_')
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Flow Images</h1>
        <p className="text-sm text-gray-600">
          Upload banners, icons and PDF documents used by the WhatsApp chatbot and grievance flow. Changes go live within a few seconds (cache invalidates on upload, ~10 min otherwise).
        </p>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : (
        <>
          {GROUP_LABELS.map(([gkey, label], idx) =>
            renderGroup(gkey, label, idx < 4 /* main groups open by default */)
          )}
          {optionGroupKeys.map((gkey) => renderGroup(gkey, prettyOptionLabel(gkey), false))}
          {extraGroupKeys.map((gkey) => renderGroup(gkey, gkey, false))}
        </>
      )}
    </div>
  );
}
