import { MongoClient } from 'mongodb';
import { readFile } from 'node:fs/promises';
import { buildGameListUpdate } from '../lib/gamelist-migration.mjs';

// Default is read-only. Credentials are supplied only through server environment.
const apply = process.argv.includes('--apply');
const rollback = process.argv.includes('--rollback');
const manifestFlag = process.argv.indexOf('--manifest');
const manifestPath = manifestFlag < 0 ? '' : process.argv[manifestFlag + 1];
if (!manifestPath || manifestPath.startsWith('--')) throw new Error('Provide --manifest with the path to your private migration file');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
const client = new MongoClient(process.env.MONGODB_URI);
try {
  await client.connect();
  const db = client.db('test');
  const collection = db.collection('gamelists');
  const docs = await collection.find({}).toArray();
  const counts = Object.fromEntries(docs.map(doc => [doc.platform, doc.items.length]));
  if (JSON.stringify(Object.entries(counts).sort()) !== JSON.stringify(Object.entries(manifest.counts).sort())) throw new Error('Game counts changed; inspect the catalogue before migrating');
  const operations = [];
  for (const doc of docs) {
    const entries = manifest.entries.filter(entry => entry.platform === doc.platform);
    // A second run fails its original-value checks instead of overwriting later edits.
    if (entries.length) operations.push(buildGameListUpdate(doc, entries, rollback));
  }
  if (apply) {
    const backup = db.collection(`gamelists_migration_backup_${Date.now()}`);
    await backup.insertMany(docs);
    for (const operation of operations) {
      const result = await collection.updateOne(operation.filter, operation.update);
      if (result.matchedCount !== 1) throw new Error('Concurrent edit detected; migration stopped');
    }
    console.log({ mode: rollback ? 'rollback' : 'apply', documents: operations.length, counts });
  } else console.log({ mode: 'dry-run', rollback, documents: operations.length, counts, games: manifest.entries.length });
} finally { await client.close(); }
