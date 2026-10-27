import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { app } from '../src/routes/server.js';
import pool from '../src/config/database.js';

const arquivoAtendimentos = new URL('../data/atendimentos.json', import.meta.url);
const arquivoConfiguracoes = new URL('../data/configuracoes.json', import.meta.url);
let cookieSessao = '';
const fetch = (url, opcoes = {}) => globalThis.fetch(url, {
  ...opcoes,
  headers: {
    ...opcoes.headers,
    ...(cookieSessao ? { Cookie: cookieSessao } : {})
  }
});

test('cadastra serviços e clientes, e atualiza a oferta do serviço', async () => {
  const backupAtendimentos = fs.readFileSync(arquivoAtendimentos, 'utf-8');
  const backupConfiguracoes = fs.readFileSync(arquivoConfiguracoes, 'utf-8');
  const consultaOriginal = pool.query;
  const servicosBanco = new Map();
  const clientesBanco = new Map();
  const primeiroUsuario = {
    id: 1,
    nome: 'Administrador de teste',
    email: 'admin@teste.local',
    senha: 'senhaTeste123',
    cargo: 'administrador',
    precisaAlterarSenha: false,
    podeGerenciarUsuarios: true
  };
  const usuariosBanco = new Map([['1', primeiroUsuario]]);
  let proximoIdServico = 1;
  let proximoIdCliente = 1;
  pool.query = async (consulta, parametros = []) => {
    if (consulta.includes('FROM usuarios') && consulta.includes('WHERE email = $1')) {
      const email = parametros[0];
      const usuario = [...usuariosBanco.values()].find((item) => (
        item.email === email || (consulta.includes('lower(nome)') && item.nome.toLowerCase() === email)
      ));
      return { rows: usuario ? [{ ...usuario }] : [] };
    }
    if (consulta.startsWith('UPDATE usuarios')) {
      const usuario = usuariosBanco.get(String(parametros[2]));
      if (!usuario) return { rows: [] };
      usuario.senha = parametros[0];
      usuario.precisaAlterarSenha = parametros[1];
      return { rows: [{ ...usuario }] };
    }
    if (consulta.startsWith('SELECT id, nome, telefone, data_nascimento')) {
      if (consulta.includes('regexp_replace')) {
        const cliente = [...clientesBanco.values()].find(
          (item) => item.telefone.replace(/\D/g, '') === parametros[0]
        );
        return { rows: cliente ? [{ ...cliente }] : [] };
      }
      if (consulta.includes('WHERE id = $1')) {
        const cliente = clientesBanco.get(Number(parametros[0]));
        return { rows: cliente ? [{ ...cliente }] : [] };
      }
      return {
        rows: [...clientesBanco.values()].sort((a, b) => a.id - b.id).map((cliente) => ({ ...cliente }))
      };
    }
    if (consulta.startsWith('INSERT INTO clientes')) {
      const cliente = {
        id: proximoIdCliente++,
        nome: parametros[0],
        telefone: parametros[1],
        dataNascimento: parametros[2],
        cep: parametros[3],
        dataCadastro: new Date().toISOString()
      };
      clientesBanco.set(cliente.id, cliente);
      return { rows: [{ ...cliente }] };
    }
    if (consulta.startsWith('UPDATE clientes')) {
      const cliente = clientesBanco.get(Number(parametros[4]));
      if (!cliente) return { rows: [] };
      [cliente.nome, cliente.telefone] = parametros;
      cliente.dataNascimento = parametros[2] ?? cliente.dataNascimento;
      cliente.cep = parametros[3];
      return { rows: [{ ...cliente }] };
    }
    if (consulta.startsWith('DELETE FROM clientes')) {
      const id = Number(parametros[0]);
      return { rows: clientesBanco.delete(id) ? [{ id }] : [] };
    }
    if (consulta.startsWith('SELECT id, nome, duracao_minutos')) {
      return { rows: [...servicosBanco.values()].sort((a, b) => a.id - b.id) };
    }
    if (consulta.startsWith('INSERT INTO servicos')) {
      const servico = {
        id: proximoIdServico++,
        nome: parametros[0],
        duracaoMinutos: parametros[1],
        valor: parametros[2],
        ofertado: true
      };
      servicosBanco.set(servico.id, servico);
      return { rows: [servico] };
    }
    if (consulta.startsWith('SELECT id, nome FROM servicos')) {
      const servico = servicosBanco.get(Number(parametros[0]));
      return { rows: servico?.ofertado ? [{ id: servico.id, nome: servico.nome }] : [] };
    }
    if (consulta.startsWith('UPDATE servicos')) {
      const servico = servicosBanco.get(Number(parametros.at(-1)));
      if (!servico) return { rows: [] };
      if (consulta.includes('SET ofertado = $1')) {
        servico.ofertado = parametros[0];
      } else {
        [servico.nome, servico.duracaoMinutos, servico.valor] = parametros;
      }
      return { rows: [{ ...servico }] };
    }
    if (consulta.startsWith('DELETE FROM servicos')) {
      const id = Number(parametros[0]);
      return { rows: servicosBanco.delete(id) ? [{ id }] : [] };
    }
    throw new Error(`Consulta de teste não reconhecida: ${consulta}`);
  };
  const servidor = app.listen(0);
  await new Promise((resolve) => servidor.once('listening', resolve));
  const baseUrl = `http://localhost:${servidor.address().port}`;

  try {
    fs.writeFileSync(arquivoAtendimentos, '[]');
    const usuario = primeiroUsuario;
    const senhaTeste = 'senhaTeste123';
    const respostaLogin = await globalThis.fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: usuario.email, senha: senhaTeste })
    });
    assert.equal(respostaLogin.status, 200);
    cookieSessao = respostaLogin.headers.get('set-cookie').split(';', 1)[0];

    const respostaHorarios = await fetch(`${baseUrl}/configuracoes/horarios`);
    assert.equal(respostaHorarios.status, 200);
    assert.deepEqual(await respostaHorarios.json(), {
      manha: { inicio: '08:00', fim: '12:00' },
      tarde: { inicio: '13:00', fim: '19:00' }
    });

    const respostaSalvarHorarios = await fetch(`${baseUrl}/configuracoes/horarios`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manha: { inicio: '08:00', fim: '12:00' },
        tarde: { inicio: '13:00', fim: '22:30' }
      })
    });
    assert.equal(respostaSalvarHorarios.status, 200);
    assert.deepEqual((await respostaSalvarHorarios.json()).horarios, {
      manha: { inicio: '08:00', fim: '12:00' },
      tarde: { inicio: '13:00', fim: '22:30' }
    });

    const respostaTurnosSobrepostos = await fetch(`${baseUrl}/configuracoes/horarios`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manha: { inicio: '08:00', fim: '14:00' },
        tarde: { inicio: '13:00', fim: '20:00' }
      })
    });
    assert.equal(respostaTurnosSobrepostos.status, 400);

    const respostaServico = await fetch(`${baseUrl}/servicos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Manicure', duracaoMinutos: 45, valor: 75.5 })
    });
    assert.equal(respostaServico.status, 201);
    const { servico } = await respostaServico.json();
    assert.equal(servico.ofertado, true);
    assert.equal(servico.valor, 75.5);
    assert.ok(servico.id);

    const respostaListaServicos = await fetch(`${baseUrl}/servicos`);
    assert.equal(respostaListaServicos.status, 200);
    assert.deepEqual(await respostaListaServicos.json(), [servico]);

    const respostaServicoSemValor = await fetch(`${baseUrl}/servicos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Pedicure', duracaoMinutos: 30 })
    });
    assert.equal(respostaServicoSemValor.status, 400);

    const respostaCliente = await fetch(`${baseUrl}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Cliente Teste',
        telefone: '(11) 91234-5678',
        dataNascimento: '1990-05-20',
        cep: '12345-678'
      })
    });
    assert.equal(respostaCliente.status, 201);
    const clienteCriado = (await respostaCliente.json()).cliente;
    assert.equal(clienteCriado.idade, 36);
    assert.equal(clienteCriado.servicoId, undefined);

    const respostaListaClientes = await fetch(`${baseUrl}/clientes`);
    const clientes = await respostaListaClientes.json();
    assert.equal(clientes.length, 1);
    assert.equal(clienteCriado.telefone, '11912345678');
    assert.equal(clienteCriado.idade, 36);

    const respostaClienteComNascimento = await fetch(`${baseUrl}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Ana Maria',
        telefone: '98765432',
        dataNascimento: '2000-01-01',
        cep: '12345678'
      })
    });
    assert.equal(respostaClienteComNascimento.status, 201);
    const clienteComNascimento = (await respostaClienteComNascimento.json()).cliente;
    assert.equal(clienteComNascimento.idade, 26);
    assert.equal(clienteComNascimento.dataNascimento, '2000-01-01');

    const respostaEdicaoClienteComNascimento = await fetch(`${baseUrl}/clientes/${clienteComNascimento.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Ana Maria Silva',
        telefone: '98765432',
        dataNascimento: '1997-09-10',
        cep: '12345678'
      })
    });
    assert.equal(respostaEdicaoClienteComNascimento.status, 200);
    assert.equal((await respostaEdicaoClienteComNascimento.json()).cliente.idade, 29);

    const clienteLegado = {
      id: 999,
      nome: 'Cliente Legado',
      telefone: '11911112222',
      dataNascimento: '1984-01-01',
      dataCadastro: new Date().toISOString(),
      cep: '12345678'
    };
    clientesBanco.set(clienteLegado.id, clienteLegado);
    const respostaEdicaoLegado = await fetch(`${baseUrl}/clientes/${clienteLegado.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Cliente Legado Atualizado',
        telefone: clienteLegado.telefone,
        cep: clienteLegado.cep
      })
    });
    assert.equal(respostaEdicaoLegado.status, 200);
    assert.equal((await respostaEdicaoLegado.json()).cliente.idade, 42);

    const clientesInvalidos = [
      { nome: 'Cliente 123', telefone: '11912345678', dataNascimento: '1990-05-20' },
      { nome: 'Cliente Teste', telefone: 'telefone', dataNascimento: '1990-05-20' },
      { nome: 'Cliente Teste', telefone: '11912345678', dataNascimento: '19900-05-20' },
      { nome: 'Cliente Teste', telefone: '11912345678', dataNascimento: '2027-01-01' }
    ];
    for (const dadosInvalidos of clientesInvalidos) {
      const respostaInvalida = await fetch(`${baseUrl}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dadosInvalidos,
          cep: '12345678'
        })
      });
      assert.equal(respostaInvalida.status, 400);
    }

    const respostaOferta = await fetch(`${baseUrl}/servicos/${servico.id}/oferta`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ofertado: false })
    });
    assert.equal(respostaOferta.status, 200);

    const respostaClienteSemServico = await fetch(`${baseUrl}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Outro Cliente',
        telefone: '11912345678',
        dataNascimento: '1990-05-20',
        cep: '12345678'
      })
    });
    assert.equal(respostaClienteSemServico.status, 201);
    const clienteSemServico = (await respostaClienteSemServico.json()).cliente;
    assert.equal(clienteSemServico.servicoId, undefined);

    const respostaReoferta = await fetch(`${baseUrl}/servicos/${servico.id}/oferta`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ofertado: true })
    });
    assert.equal(respostaReoferta.status, 200);

    const respostaEdicaoServico = await fetch(`${baseUrl}/servicos/${servico.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Manicure atualizada', duracaoMinutos: 50, valor: 80 })
    });
    assert.equal(respostaEdicaoServico.status, 200);

    const respostaEdicaoCliente = await fetch(`${baseUrl}/clientes/${clienteCriado.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Cliente Editado',
        telefone: '11987654321',
        dataNascimento: '1991-06-21',
        cep: '87654-321'
      })
    });
    assert.equal(respostaEdicaoCliente.status, 200);
    const { cliente: clienteEditado } = await respostaEdicaoCliente.json();
    assert.equal(clienteEditado.nome, 'Cliente Editado');
    assert.equal(clienteEditado.idade, 35);
    assert.equal(clienteEditado.servicoId, undefined);

    const respostaEdicaoClienteInvalida = await fetch(`${baseUrl}/clientes/${clienteCriado.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: '<script>alert(1)</script>',
        telefone: '11987654321',
        dataNascimento: '1990-05-20',
        cep: '87654321'
      })
    });
    assert.equal(respostaEdicaoClienteInvalida.status, 400);

    const dataAtendimento = new Date();
    dataAtendimento.setDate(dataAtendimento.getDate() + 1);
    const dataSeguinte = new Date(dataAtendimento);
    dataSeguinte.setDate(dataSeguinte.getDate() + 1);
    const formatarDataLocal = (data) =>
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    const dataMarcada = formatarDataLocal(dataAtendimento);
    const dataSeguinteMarcada = formatarDataLocal(dataSeguinte);
    const enviarAtendimento = (dados) => fetch(`${baseUrl}/atendimentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const dadosAtendimentoExistente = {
      clienteId: clienteCriado.id,
      nome: 'Cliente Editado',
      telefone: '11987654321',
      idade: 35,
      data: dataMarcada,
      horario: '10:30',
      servicoId: servico.id
    };
    const respostaAtendimentoInvalido = await enviarAtendimento({
      ...dadosAtendimentoExistente,
      horario: '29:80'
    });
    assert.equal(respostaAtendimentoInvalido.status, 400);
    const respostaClienteAtendimentoInvalido = await enviarAtendimento({
      ...dadosAtendimentoExistente,
      nome: 'Cliente 99'
    });
    assert.equal(respostaClienteAtendimentoInvalido.status, 400);

    const respostaAtendimentoExistente = await enviarAtendimento(dadosAtendimentoExistente);
    assert.equal(respostaAtendimentoExistente.status, 201);
    const atendimentoExistente = (await respostaAtendimentoExistente.json()).atendimento;
    assert.equal(atendimentoExistente.clienteId, clienteCriado.id);

    const respostaConflito = await enviarAtendimento({
      nome: 'Maria Nova',
      telefone: '12345678',
      idade: 28,
      data: dataMarcada,
      horario: '10:30',
      servicoId: servico.id
    });
    assert.equal(respostaConflito.status, 409);

    const respostaAtendimentoNovo = await enviarAtendimento({
      nome: 'Maria Nova',
      telefone: '12345678',
      idade: 28,
      data: dataMarcada,
      horario: '10:30',
      servicoId: servico.id,
      confirmarConflito: true
    });
    assert.equal(respostaAtendimentoNovo.status, 201);
    const atendimentoNovo = (await respostaAtendimentoNovo.json()).atendimento;
    assert.equal(atendimentoNovo.clienteId, null);

    const respostaAtendimentoMaisTarde = await enviarAtendimento({
      nome: 'Joana Silva',
      telefone: '98765432',
      idade: 31,
      data: dataSeguinteMarcada,
      horario: '09:15',
      servicoId: servico.id
    });
    assert.equal(respostaAtendimentoMaisTarde.status, 201);
    const atendimentoMaisTarde = (await respostaAtendimentoMaisTarde.json()).atendimento;

    const respostaForaDoTurno = await enviarAtendimento({
      nome: 'Joana Silva',
      telefone: '98765432',
      idade: 31,
      data: dataSeguinteMarcada,
      horario: '22:45',
      servicoId: servico.id
    });
    assert.equal(respostaForaDoTurno.status, 201);
    const atendimentoForaDoTurno = (await respostaForaDoTurno.json()).atendimento;

    const respostaListaAtendimentos = await fetch(`${baseUrl}/atendimentos`);
    const atendimentos = await respostaListaAtendimentos.json();
    assert.deepEqual(atendimentos.map((item) => item.id), [
      atendimentoExistente.id,
      atendimentoNovo.id,
      atendimentoMaisTarde.id,
      atendimentoForaDoTurno.id
    ]);

    const respostaStatusInvalido = await fetch(`${baseUrl}/atendimentos/${atendimentoNovo.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'desconhecido' })
    });
    assert.equal(respostaStatusInvalido.status, 400);

    const respostaConflitoStatus = await fetch(`${baseUrl}/atendimentos/${atendimentoNovo.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'em atendimento' })
    });
    assert.equal(respostaConflitoStatus.status, 409);

    for (const [atendimento, status, confirmarConflito] of [
      [atendimentoExistente, 'em atendimento', true],
      [atendimentoNovo, 'cancelado', false],
      [atendimentoMaisTarde, 'concluído', false]
    ]) {
      const respostaStatus = await fetch(`${baseUrl}/atendimentos/${atendimento.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(confirmarConflito ? { confirmarConflito: true } : {}) })
      });
      assert.equal(respostaStatus.status, 200);
      assert.equal((await respostaStatus.json()).atendimento.status, status);
    }

    const respostaEdicaoAtendimento = await fetch(`${baseUrl}/atendimentos/${atendimentoNovo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Maria Nova',
        telefone: '12345678',
        idade: 29,
        data: dataSeguinteMarcada,
        horario: '10:00',
        servicoId: servico.id,
        status: 'aguardando'
      })
    });
    assert.equal(respostaEdicaoAtendimento.status, 200);
    assert.equal((await respostaEdicaoAtendimento.json()).atendimento.idade, 29);

    for (const atendimento of [
      atendimentoExistente,
      atendimentoNovo,
      atendimentoMaisTarde,
      atendimentoForaDoTurno
    ]) {
      const respostaRemocaoAtendimento = await fetch(`${baseUrl}/atendimentos/${atendimento.id}`, {
        method: 'DELETE'
      });
      assert.equal(respostaRemocaoAtendimento.status, 200);
    }

    for (const cliente of [clienteCriado, clienteComNascimento, clienteSemServico, clienteLegado]) {
      const respostaExclusaoCliente = await fetch(`${baseUrl}/clientes/${cliente.id}`, {
        method: 'DELETE'
      });
      assert.equal(respostaExclusaoCliente.status, 200);
    }
    const respostaExclusaoServico = await fetch(`${baseUrl}/servicos/${servico.id}`, {
      method: 'DELETE'
    });
    assert.equal(respostaExclusaoServico.status, 200);
  } finally {
    fs.writeFileSync(arquivoAtendimentos, backupAtendimentos);
    fs.writeFileSync(arquivoConfiguracoes, backupConfiguracoes);
    pool.query = consultaOriginal;
    await new Promise((resolve, reject) => {
      servidor.close((erro) => (erro ? reject(erro) : resolve()));
    });
  }
});
