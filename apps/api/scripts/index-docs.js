import { indexAllDocuments } from '../src/services/rag.js';
import { pool } from '../src/db/pool.js';

const run = async () => {
  try {
    const results = await indexAllDocuments();
    console.log(`Documentos indexados: ${results.length}`);
    for (const result of results) {
      console.log(`  - ${result.title}: ${result.chunks} chunks`);
    }
  } catch (error) {
    console.error('Error indexando documentos:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
