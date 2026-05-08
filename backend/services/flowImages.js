const FlowImage = require('../models/FlowImage');
const { allImageKeys } = require('./serviceCatalog');
const { allMenuImageKeys } = require('./menuImageKeys');
const { allActionImageKeys } = require('./issueActions');

// Aggregate every key the flow / chatbot might look up at runtime.
//   1. service-catalog icons + banners (existing)
//   2. main-menu icons + social icons + Contact MLA / Helplines / Events headers
//   3. per-issue header_* and pdf_* keys referenced by the action map
const ACTION_IMAGE_SPECS = allActionImageKeys().map((key) => ({
  key,
  label: key.startsWith('pdf_')
    ? `PDF document: ${key.replace(/^pdf_/, '').replace(/_/g, ' ')}`
    : `Per-issue header: ${key.replace(/^header_/, '').replace(/_/g, ' ')}`,
  group: key.startsWith('pdf_') ? 'pdf_documents' : 'issue_headers',
}));

const IMAGE_KEYS = [
  ...allImageKeys(),
  ...allMenuImageKeys(),
  ...ACTION_IMAGE_SPECS,
];

async function ensureKeysExist() {
  for (const item of IMAGE_KEYS) {
    await FlowImage.updateOne(
      { key: item.key },
      { $setOnInsert: { key: item.key, label: item.label, url: '', publicId: '' } },
      { upsert: true }
    );
  }
}

async function getUrl(key) {
  const doc = await FlowImage.findOne({ key }).lean();
  return doc?.url || '';
}

async function getMap(keys) {
  const docs = await FlowImage.find({ key: { $in: keys } }).lean();
  const out = {};
  keys.forEach((k) => (out[k] = ''));
  docs.forEach((d) => {
    out[d.key] = d.url || '';
  });
  return out;
}

module.exports = { IMAGE_KEYS, ensureKeysExist, getUrl, getMap };
