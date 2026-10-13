import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { app } from '../src/server.js';

const arquivoUsuarios = new URL('../data/users.json', import.meta.url);
const backupUsuarios = fs.readFileSync(arquivoUsuarios, 'utf-8');

async function iniciarServidor() {
  const servidor = app.listen(0);
  await new Promise((resolve) => servidor.once('listening', resolve));
  const porta = servidor.address().port;

  return { servidor, porta };
}

test('somente usuários existentes podem entrar e trocar a própria senha', async () => {
  const { servidor, porta } = await iniciarServidor();

  try {
    const respostaListagem = await fetch(`http://localhost:${porta}/usuarios`);
    assert.equal(respostaListagem.status, 404);

    const respostaCadastro = await fetch(`http://localhost:${porta}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Usuario Teste',
        email: 'teste@empresa.com',
        senha: '123456'
      })
    });

    assert.equal(respostaCadastro.status, 404);

    const respostaSenhaIncorreta = await fetch(`http://localhost:${porta}/alterar-senha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pedro@empresa.com',
        senhaAtual: 'incorreta',
        novaSenha: 'senhaNova123'
      })
    });
    assert.equal(respostaSenhaIncorreta.status, 401);

    const respostaAlteracao = await fetch(`http://localhost:${porta}/alterar-senha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pedro@empresa.com',
        senhaAtual: 'pedro123',
        novaSenha: 'senhaNova123'
      })
    });
    assert.equal(respostaAlteracao.status, 200);

    const respostaLoginAntiga = await fetch(`http://localhost:${porta}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pedro@empresa.com', senha: 'pedro123' })
    });
    assert.equal(respostaLoginAntiga.status, 401);

    const respostaLoginNova = await fetch(`http://localhost:${porta}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pedro@empresa.com', senha: 'senhaNova123' })
    });
    assert.equal(respostaLoginNova.status, 200);
  } finally {
    // Restaura o arquivo compartilhado para não deixar o usuário de teste persistido.
    fs.writeFileSync(arquivoUsuarios, backupUsuarios);

    await new Promise((resolve, reject) => {
      servidor.close((erro) => (erro ? reject(erro) : resolve()));
    });
  }
});
