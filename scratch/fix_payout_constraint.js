const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:wcicAWrp4AvfZbWf@db.ivlaeilkomqhqwerojny.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runSQL() {
  try {
    await client.connect();
    console.log('Connected to Postgres DB!');

    await client.query(`
      ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
      ALTER TABLE payouts ADD CONSTRAINT payouts_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'pending_manual_transfer'));
    `);

    console.log('Check constraint alterada com sucesso em payouts!');
  } catch (err) {
    console.error('Erro na conexão ou query:', err);
  } finally {
    await client.end();
  }
}

runSQL();
