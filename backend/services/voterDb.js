/**
 * Read-only connection to the external Voter DB.
 *
 * The voter roll lives in a separate Mongo cluster and is read-only from our
 * side. Schema (per probe of `voter_db.ass_25`, ~194k rows):
 *   ID, ASSEMBLY_NO, ASSEMBLY_NAME, HOUSE_NO, VOTER_NAME, RELATION_TYPE,
 *   RELATION_NAME, EPIC_NO, MOBILE_NUMBER, GENDER
 *
 * NOTE: there is no DOB / AGE field in the source data — we collect DOB from
 * the user during registration and persist it in our own Member record.
 */
const mongoose = require('mongoose');

let connection = null;
let connectPromise = null;

function getConnection() {
  const uri = process.env.VOTER_DB_URI;
  if (!uri) {
    throw new Error('VOTER_DB_URI is not configured');
  }
  if (connection && connection.readyState === 1) return Promise.resolve(connection);
  if (connectPromise) return connectPromise;

  connectPromise = mongoose
    .createConnection(uri, { serverSelectionTimeoutMS: 8000 })
    .asPromise()
    .then((conn) => {
      connection = conn;
      conn.on('disconnected', () => {
        console.warn('[voterDb] disconnected');
      });
      conn.on('error', (err) => {
        console.error('[voterDb] error:', err.message);
      });
      console.log('[voterDb] connected');
      return conn;
    })
    .catch((err) => {
      connectPromise = null;
      throw err;
    });
  return connectPromise;
}

/**
 * Look up a voter by EPIC number across all assembly collections.
 * Returns the first match with normalized fields, or null.
 */
async function findVoterByEpic(epicRaw) {
  if (!epicRaw) return null;
  const epic = String(epicRaw).trim().toUpperCase();
  if (!epic) return null;

  const conn = await getConnection();
  // Search every collection in the voter DB (currently just `ass_25` but the
  // app should keep working as new assembly collections are added).
  const colls = await conn.db.listCollections().toArray();
  for (const { name } of colls) {
    if (name.startsWith('system.')) continue;
    // EPIC_NO in the source data is always uppercase. Try exact match first
    // (uses index if present), then fall back to a case-insensitive lookup.
    let doc = await conn.db.collection(name).findOne({ EPIC_NO: epic });
    if (!doc) {
      doc = await conn.db
        .collection(name)
        .findOne({ EPIC_NO: { $regex: `^${escapeRegex(epic)}$`, $options: 'i' } });
    }
    if (doc) return normalizeVoter(doc, name);
  }
  return null;
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeVoter(doc, sourceCollection) {
  if (!doc) return null;
  return {
    sourceCollection,
    voterId: doc.ID || null,
    name: clean(doc.VOTER_NAME),
    epicNo: clean(doc.EPIC_NO),
    relationType: clean(doc.RELATION_TYPE),
    relationName: clean(doc.RELATION_NAME),
    gender: clean(doc.GENDER),
    houseNo: clean(doc.HOUSE_NO),
    mobile: clean(doc.MOBILE_NUMBER),
    assemblyNo: clean(doc.ASSEMBLY_NO),
    assemblyName: clean(doc.ASSEMBLY_NAME),
  };
}

function clean(v) {
  if (v === undefined || v === null) return '';
  const s = String(v).trim();
  if (s === '-' || s === 'null' || s === 'undefined') return '';
  return s;
}

/** Return the list of assembly collections in the voter DB (sorted). */
async function listAssemblyCollections() {
  const conn = await getConnection();
  const colls = await conn.db.listCollections().toArray();
  return colls
    .map((c) => c.name)
    .filter((n) => !n.startsWith('system.'))
    .sort();
}

/**
 * Paginated voter listing across all assembly collections.
 *
 * @param {object} opts
 * @param {string} [opts.q]         substring search across name / EPIC / relation / mobile
 * @param {string} [opts.assembly]  restrict to a single collection (e.g. 'ass_25')
 * @param {number} [opts.page=1]    1-indexed page number
 * @param {number} [opts.limit=50]  page size (max 200)
 * @returns {Promise<{ items, total, page, limit, collections }>}
 */
async function listVoters({ q = '', assembly = '', page = 1, limit = 50 } = {}) {
  const conn = await getConnection();
  const all = await listAssemblyCollections();
  const targets = assembly ? all.filter((n) => n === assembly) : all;

  const filter = {};
  if (q) {
    const re = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [
      { VOTER_NAME: re },
      { EPIC_NO: re },
      { RELATION_NAME: re },
      { MOBILE_NUMBER: re },
      { HOUSE_NO: re },
    ];
  }

  // Per-collection counts so we can paginate across the union without loading
  // every doc into memory.
  const counts = await Promise.all(
    targets.map((name) => conn.db.collection(name).countDocuments(filter))
  );
  const total = counts.reduce((a, b) => a + b, 0);

  let skip = Math.max(0, (page - 1) * limit);
  let take = limit;
  const items = [];
  for (let i = 0; i < targets.length && take > 0; i++) {
    const name = targets[i];
    const collTotal = counts[i];
    if (skip >= collTotal) {
      skip -= collTotal;
      continue;
    }
    const docs = await conn.db
      .collection(name)
      .find(filter)
      .sort({ _id: 1 })
      .skip(skip)
      .limit(take)
      .toArray();
    skip = 0;
    for (const d of docs) {
      items.push({ ...normalizeVoter(d, name), _id: String(d._id) });
    }
    take -= docs.length;
  }

  return { items, total, page, limit, collections: all };
}

/**
 * Look up a voter by their Mongo `_id` (string ObjectId) OR by EPIC number.
 * Searches all assembly collections.
 */
async function findVoterById(idOrEpic) {
  if (!idOrEpic) return null;
  const conn = await getConnection();
  const all = await listAssemblyCollections();

  const mongoose = require('mongoose');
  let oid = null;
  if (typeof idOrEpic === 'string' && mongoose.isValidObjectId(idOrEpic)) {
    try {
      oid = new mongoose.Types.ObjectId(idOrEpic);
    } catch {}
  }
  const epicGuess = String(idOrEpic).trim().toUpperCase();

  for (const name of all) {
    let doc = null;
    if (oid) {
      doc = await conn.db.collection(name).findOne({ _id: oid });
    }
    if (!doc) {
      doc = await conn.db.collection(name).findOne({ EPIC_NO: epicGuess });
    }
    if (!doc) {
      doc = await conn.db
        .collection(name)
        .findOne({ EPIC_NO: { $regex: `^${escapeRegex(epicGuess)}$`, $options: 'i' } });
    }
    if (doc) {
      return {
        ...normalizeVoter(doc, name),
        _id: String(doc._id),
        raw: doc,
      };
    }
  }
  return null;
}

module.exports = {
  getConnection,
  findVoterByEpic,
  findVoterById,
  listVoters,
  listAssemblyCollections,
  normalizeVoter,
};
