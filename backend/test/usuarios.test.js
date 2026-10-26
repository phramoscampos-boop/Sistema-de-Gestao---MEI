import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { app } from '../src/routes/server.js';
import { normalizarUsuario } from '../src/services/userService.js';

test('contas antigas só recebem privilégios na migração inicial', () => {
  const contaLegada = { id: 'conta-legada', nome: 'Conta Legada', email: 'legado@empresa.com', senha: 'hash' };

  assert.deepEqual(
    [normalizarUsuario(contaLegada, 0).papel, normalizarUsuario(contaLegada, 0).podeGerenciarUsuarios],
    ['usuario', false]
  );
  assert.deepEqual(
    [
      normalizarUsuario(contaLegada, 0, true).papel,
      normalizarUsuario(contaLegada, 0, true).podeGerenciarUsuarios
    ],
    ['administrador', true]
  );
});

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
    const respostaSessaoAusente = await fetch(`http://localhost:${porta}/auth/session`);
    assert.equal(respostaSessaoAusente.status, 204);

    const respostaSemSessao = await fetch(`http://localhost:${porta}/clientes`);
    assert.equal(respostaSemSessao.status, 401);

    const respostaEmailSemSessao = await fetch(`http://localhost:${porta}/alterar-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novoEmail: 'novo@empresa.com', senhaAtual: 'senha' })
    });
    assert.equal(respostaEmailSemSessao.status, 401);

    const respostaDashboardSemSessao = await fetch(`http://localhost:${porta}/html/dashboard.html`);
    assert.equal(respostaDashboardSemSessao.status, 401);

    const respostaListagemSemSessao = await fetch(`http://localhost:${porta}/usuarios`);
    assert.equal(respostaListagemSemSessao.status, 401);

    const respostaCadastro = await fetch(`http://localhost:${porta}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Usuario Teste',
        email: 'teste@empresa.com',
        senha: '123456'
      })
    });

    assert.equal(respostaCadastro.status, 401);

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
    assert.match(fs.readFileSync(arquivoUsuarios, 'utf-8'), /"\$2[aby]\$10\$/);

    const cookieSessao = respostaLoginNova.headers.get('set-cookie').split(';', 1)[0];
    const respostaDashboardAutenticada = await fetch(`http://localhost:${porta}/html/dashboard.html`, {
      headers: { Cookie: cookieSessao }
    });
    assert.equal(respostaDashboardAutenticada.status, 200);

    const respostaListagem = await fetch(`http://localhost:${porta}/usuarios`, {
      headers: { Cookie: cookieSessao }
    });
    assert.equal(respostaListagem.status, 200);
    const usuariosListados = await respostaListagem.json();
    assert.ok(usuariosListados.every((usuario) => !('senha' in usuario)));
    assert.ok(usuariosListados.some((usuario) => usuario.email === 'pedro@empresa.com'));

    const respostaCadastroUsuario = await fetch(`http://localhost:${porta}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieSessao },
      body: JSON.stringify({
        nome: 'Usuario Temporario',
        email: 'temporario@empresa.com',
        papel: 'usuario'
      })
    });
    assert.equal(respostaCadastroUsuario.status, 201);
    const { usuario: usuarioTemporario, senhaTemporaria } = await respostaCadastroUsuario.json();
    assert.equal(usuarioTemporario.papel, 'usuario');
    assert.equal(usuarioTemporario.precisaAlterarSenha, true);
    assert.equal(senhaTemporaria, '12345');

    const respostaLoginTemporario = await fetch(`http://localhost:${porta}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: usuarioTemporario.email, senha: senhaTemporaria })
    });
    assert.equal(respostaLoginTemporario.status, 200);
    const cookieUsuarioTemporario = respostaLoginTemporario.headers.get('set-cookie').split(';', 1)[0];
    const respostaDashboardComTrocaObrigatoria = await fetch(`http://localhost:${porta}/dashboard.html`, {
      headers: { Cookie: cookieUsuarioTemporario },
      redirect: 'manual'
    });
    assert.equal(respostaDashboardComTrocaObrigatoria.status, 302);
    assert.equal(respostaDashboardComTrocaObrigatoria.headers.get('location'), '/html/alterar-senha.html');

    const respostaListagemComoUsuario = await fetch(`http://localhost:${porta}/usuarios`, {
      headers: { Cookie: cookieUsuarioTemporario }
    });
    assert.equal(respostaListagemComoUsuario.status, 403);
    const respostaDadosAntesDaTroca = await fetch(`http://localhost:${porta}/clientes`, {
      headers: { Cookie: cookieUsuarioTemporario }
    });
    assert.equal(respostaDadosAntesDaTroca.status, 403);
    const respostaExclusaoComoUsuario = await fetch(
      `http://localhost:${porta}/usuarios/${usuariosListados.find((usuario) => usuario.email === 'pedro@empresa.com').id}`,
      { method: 'DELETE', headers: { Cookie: cookieUsuarioTemporario } }
    );
    assert.equal(respostaExclusaoComoUsuario.status, 403);

    const respostaTrocaInicial = await fetch(`http://localhost:${porta}/alterar-senha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieUsuarioTemporario },
      body: JSON.stringify({
        email: usuarioTemporario.email,
        senhaAtual: senhaTemporaria,
        novaSenha: 'senhaDefinitiva123'
      })
    });
    assert.equal(respostaTrocaInicial.status, 200);
    assert.equal((await respostaTrocaInicial.json()).irParaDashboard, true);
    const respostaDadosDepoisDaTroca = await fetch(`http://localhost:${porta}/clientes`, {
      headers: { Cookie: cookieUsuarioTemporario }
    });
    assert.equal(respostaDadosDepoisDaTroca.status, 200);

    const respostaEmailComSenhaIncorreta = await fetch(`http://localhost:${porta}/alterar-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieUsuarioTemporario },
      body: JSON.stringify({ novoEmail: 'novo@empresa.com', senhaAtual: 'incorreta' })
    });
    assert.equal(respostaEmailComSenhaIncorreta.status, 401);

    const respostaEmailInvalido = await fetch(`http://localhost:${porta}/alterar-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieUsuarioTemporario },
      body: JSON.stringify({ novoEmail: 'email-invalido', senhaAtual: 'senhaDefinitiva123' })
    });
    assert.equal(respostaEmailInvalido.status, 400);

    const respostaEmailDuplicado = await fetch(`http://localhost:${porta}/alterar-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieUsuarioTemporario },
      body: JSON.stringify({ novoEmail: 'pedro@empresa.com', senhaAtual: 'senhaDefinitiva123' })
    });
    assert.equal(respostaEmailDuplicado.status, 409);

    const respostaAlteracaoEmail = await fetch(`http://localhost:${porta}/alterar-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieUsuarioTemporario },
      body: JSON.stringify({
        novoEmail: 'Usuario.Atualizado@empresa.com',
        senhaAtual: 'senhaDefinitiva123'
      })
    });
    assert.equal(respostaAlteracaoEmail.status, 200);
    assert.equal((await respostaAlteracaoEmail.json()).usuario.email, 'usuario.atualizado@empresa.com');
    const respostaSessaoEmailAtualizado = await fetch(`http://localhost:${porta}/auth/session`, {
      headers: { Cookie: cookieUsuarioTemporario }
    });
    assert.equal(
      (await respostaSessaoEmailAtualizado.json()).usuario.email,
      'usuario.atualizado@empresa.com'
    );

    const respostaPromocaoUsuario = await fetch(
      `http://localhost:${porta}/usuarios/${usuarioTemporario.id}/papel`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookieSessao },
        body: JSON.stringify({ papel: 'administrador' })
      }
    );
    assert.equal(respostaPromocaoUsuario.status, 200);
    assert.equal((await respostaPromocaoUsuario.json()).usuario.papel, 'administrador');

    const respostaExclusaoProtegida = await fetch(
      `http://localhost:${porta}/usuarios/${usuariosListados.find((usuario) => usuario.email === 'pedro@empresa.com').id}`,
      { method: 'DELETE', headers: { Cookie: cookieSessao } }
    );
    assert.equal(respostaExclusaoProtegida.status, 403);

    const respostaExclusaoUsuario = await fetch(
      `http://localhost:${porta}/usuarios/${usuarioTemporario.id}`,
      { method: 'DELETE', headers: { Cookie: cookieSessao } }
    );
    assert.equal(respostaExclusaoUsuario.status, 200);

    const usuarioPrivilegiado = usuariosListados.find((usuario) => usuario.email === 'pedro@empresa.com');
    const respostaResetPrivilegiado = await fetch(
      `http://localhost:${porta}/usuarios/${usuarioPrivilegiado.id}/reset-senha`,
      { method: 'POST', headers: { Cookie: cookieSessao } }
    );
    assert.equal(respostaResetPrivilegiado.status, 200);
    assert.equal((await respostaResetPrivilegiado.json()).usuario.precisaAlterarSenha, true);

    const respostaLoginSenhaPadrao = await fetch(`http://localhost:${porta}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: usuarioPrivilegiado.email, senha: '12345' })
    });
    assert.equal(respostaLoginSenhaPadrao.status, 200);
    assert.equal((await respostaLoginSenhaPadrao.json()).usuario.precisaAlterarSenha, true);
    const cookiePrivilegiadoRedefinido =
      respostaLoginSenhaPadrao.headers.get('set-cookie').split(';', 1)[0];
    const respostaDadosEnquantoSenhaPendente = await fetch(`http://localhost:${porta}/clientes`, {
      headers: { Cookie: cookiePrivilegiadoRedefinido }
    });
    assert.equal(respostaDadosEnquantoSenhaPendente.status, 403);

    const respostaLogout = await fetch(`http://localhost:${porta}/logout`, {
      method: 'POST',
      headers: { Cookie: cookieSessao }
    });
    assert.equal(respostaLogout.status, 200);
    const respostaAposLogout = await fetch(`http://localhost:${porta}/clientes`, {
      headers: { Cookie: cookieSessao }
    });
    assert.equal(respostaAposLogout.status, 401);
  } finally {
    // Restaura o arquivo compartilhado para não deixar o usuário de teste persistido.
    fs.writeFileSync(arquivoUsuarios, backupUsuarios);

    await new Promise((resolve, reject) => {
      servidor.close((erro) => (erro ? reject(erro) : resolve()));
    });
  }
});
