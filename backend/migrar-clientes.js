import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrar() {
  try {
    const caminhoJson = path.join(__dirname, 'data', 'clientes.json');
    const clientes = JSON.parse(fs.readFileSync(caminhoJson, 'utf8'));

    console.log(`Lendo ${clientes.length} clientes do JSON...`);

    for (const cliente of clientes) {
      await pool.query(
        'INSERT INTO clientes (nome, telefone, data_nascimento, cep) VALUES ($1, $2, $3, $4)',
        [cliente.nome, cliente.telefone, cliente.dataNascimento, cliente.cep]
      );
    }

    console.log('✅ Clientes migrados com sucesso para o banco de dados!');
  } catch (erro) {
    console.error('❌ Erro na migração:', erro);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrar();