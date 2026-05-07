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

module.exports = { getConnection, findVoterByEpic, normalizeVoter };
