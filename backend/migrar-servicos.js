import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './src/config/database.js'; // Note o .js no final, obrigatório em imports ES

// Como estamos usando módulos modernos, precisamos recriar o __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrar() {
  try {
    const caminhoJson = path.join(__dirname, 'data', 'servicos.json');
    const servicos = JSON.parse(fs.readFileSync(caminhoJson, 'utf8'));

    console.log(`Lendo ${servicos.length} serviços do JSON...`);

    for (const servico of servicos) {
      await pool.query(
        'INSERT INTO servicos (nome, duracao_minutos, valor, ofertado) VALUES ($1, $2, $3, $4)',
        [servico.nome, servico.duracaoMinutos, servico.valor, servico.ofertado]
      );
    }

    console.log('✅ Serviços migrados com sucesso para o banco de dados!');
  } catch (erro) {
    console.error('❌ Erro na migração:', erro);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrar();