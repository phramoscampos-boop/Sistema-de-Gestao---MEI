import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrar() {
  try {
    const caminhoJson = path.join(__dirname, 'data', 'users.json');
    const usuarios = JSON.parse(fs.readFileSync(caminhoJson, 'utf8'));

    await pool.query(
      'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pode_gerenciar_usuarios BOOLEAN NOT NULL DEFAULT FALSE'
    );
    console.log(`Lendo ${usuarios.length} usuários do JSON...`);

    for (const u of usuarios) {
      await pool.query(
        `INSERT INTO usuarios
           (nome, email, senha, cargo, precisa_alterar_senha, pode_gerenciar_usuarios)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          u.nome,
          u.email,
          u.senha,
          u.cargo || u.papel || 'usuario',
          u.precisaAlterarSenha !== undefined ? u.precisaAlterarSenha : true,
          u.podeGerenciarUsuarios === true
        ]
      );
    }

    console.log('✅ Usuários migrados com sucesso para o banco de dados!');
  } catch (erro) {
    console.error('❌ Erro na migração:', erro);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrar();