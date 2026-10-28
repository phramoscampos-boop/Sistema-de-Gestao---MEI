import { Pool } from 'pg';

const configuracaoBanco = process.env.DATABASE_URL
  ? { connectionString: String(process.env.DATABASE_URL) }
  : {
    user: String(process.env.PGUSER || 'postgres'),
    host: String(process.env.PGHOST || 'localhost'),
    database: String(process.env.PGDATABASE || 'postgres'),
    password: typeof process.env.PGPASSWORD === 'string'
      ? process.env.PGPASSWORD
      : undefined,
    port: Number(process.env.PGPORT || 5432)
  };

export function validarConfiguracaoBanco() {
  if (!process.env.DATABASE_URL &&
      (typeof configuracaoBanco.password !== 'string' || !configuracaoBanco.password)) {
    throw new Error(
      'A conexão PostgreSQL não foi configurada. Defina DATABASE_URL ou PGPASSWORD.'
    );
  }
}

const pool = new Pool(configuracaoBanco);

export default pool;
