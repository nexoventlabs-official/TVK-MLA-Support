const FlowImage = require('../models/FlowImage');
const { allImageKeys } = require('./serviceCatalog');

const IMAGE_KEYS = allImageKeys();

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
