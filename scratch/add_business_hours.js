const { Client } = require('pg');

async function runSql() {
  const connectionStrings = [
    'postgres://postgres.ivlaeilkomqhqwerojny:wcicAWrp4AvfZbWf@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    'postgres://postgres.ivlaeilkomqhqwerojny:wcicAWrp4AvfZbWf@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
    'postgres://postgres:wcicAWrp4AvfZbWf@db.ivlaeilkomqhqwerojny.supabase.co:5432/postgres'
  ];

  for (const connStr of connectionStrings) {
    console.log('Trying connection string:', connStr.split('@')[1]);
    const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      console.log('Connected successfully!');
      const res = await client.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}'::jsonb;");
      console.log('Query result:', res);
      await client.end();
      console.log('SUCCESS! Added business_hours column to profiles table.');
      return;
    } catch (err) {
      console.error('Connection/Query error:', err.message);
      await client.end().catch(() => {});
    }
  }
}

runSql();
