import { Pool } from 'pg';

const configuracaoBanco = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'gestao-mei',
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT || 5432)
  };

const pool = new Pool(configuracaoBanco);

export default pool;
