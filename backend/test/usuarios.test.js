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

test('cadastro salva usuário e permite login', async () => {
  const { servidor, porta } = await iniciarServidor();

  try {
    const respostaCadastro = await fetch(`http://localhost:${porta}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Usuario Teste',
        email: 'teste@empresa.com',
        senha: '123456'
      })
    });

    assert.equal(respostaCadastro.status, 201);

    const respostaLogin = await fetch(`http://localhost:${porta}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'teste@empresa.com',
        senha: '123456'
      })
    });

    assert.equal(respostaLogin.status, 200);

    const dadosLogin = await respostaLogin.json();
    assert.equal(dadosLogin.usuario.email, 'teste@empresa.com');
  } finally {
    fs.writeFileSync(arquivoUsuarios, backupUsuarios);

    await new Promise((resolve, reject) => {
      servidor.close((erro) => (erro ? reject(erro) : resolve()));
    });
  }
});
