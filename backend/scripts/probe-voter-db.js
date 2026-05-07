const m = require('mongoose');
const URI = 'mongodb+srv://jiyasungcvslive786_db_user:gl8U0rVUCkMqEcRH@cluster0.jg8k722.mongodb.net/voter_db?appName=Cluster0';

(async () => {
  await m.connect(URI, { serverSelectionTimeoutMS: 10000 });
  const colls = await m.connection.db.listCollections().toArray();
  console.log('Collections:', colls.map((c) => c.name));

  for (const coll of colls) {
    const c = m.connection.db.collection(coll.name);
    const cnt = await c.countDocuments();
    console.log(`\n=== ${coll.name} (count=${cnt}) ===`);

    // Discover all fields by scanning many docs
    const fields = new Set();
    const cursor = c.find({}).limit(5000);
    for await (const d of cursor) Object.keys(d).forEach((k) => fields.add(k));
    console.log('Fields seen in first 5000:', [...fields]);

    // Look for any DOB-like field
    const dobLike = await c.findOne({
      $or: [
        { DOB: { $exists: true } },
        { dob: { $exists: true } },
        { AGE: { $exists: true } },
        { age: { $exists: true } },
        { BIRTH_DATE: { $exists: true } },
        { birth_date: { $exists: true } },
        { DATE_OF_BIRTH: { $exists: true } },
      ],
    });
    console.log('DOB-like sample:', dobLike);

    // Show 3 random samples
    const samples = await c.aggregate([{ $sample: { size: 3 } }]).toArray();
    console.log('Random samples:');
    samples.forEach((s) => console.log(JSON.stringify(s)));
  }
  process.exit(0);
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
