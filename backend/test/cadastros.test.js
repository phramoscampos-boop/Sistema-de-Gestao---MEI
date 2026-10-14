import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { app } from '../src/server.js';

const arquivoClientes = new URL('../data/clientes.json', import.meta.url);
const arquivoServicos = new URL('../data/servicos.json', import.meta.url);
const arquivoAtendimentos = new URL('../data/atendimentos.json', import.meta.url);

test('cadastra serviços e clientes, e atualiza a oferta do serviço', async () => {
  const backupClientes = fs.readFileSync(arquivoClientes, 'utf-8');
  const backupServicos = fs.readFileSync(arquivoServicos, 'utf-8');
  const backupAtendimentos = fs.readFileSync(arquivoAtendimentos, 'utf-8');
  const quantidadeClientesInicial = JSON.parse(backupClientes).length;
  const servidor = app.listen(0);
  await new Promise((resolve) => servidor.once('listening', resolve));
  const baseUrl = `http://localhost:${servidor.address().port}`;

  try {
    const respostaServico = await fetch(`${baseUrl}/servicos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Manicure', duracaoMinutos: 45, valor: 75.5 })
    });
    assert.equal(respostaServico.status, 201);
    const { servico } = await respostaServico.json();
    assert.equal(servico.ofertado, true);
    assert.equal(servico.valor, 75.5);

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
        cep: '12345-678',
        servicoId: servico.id
      })
    });
    assert.equal(respostaCliente.status, 201);

    const respostaListaClientes = await fetch(`${baseUrl}/clientes`);
    const clientes = await respostaListaClientes.json();
    assert.equal(clientes.length, quantidadeClientesInicial + 1);
    const clienteCriado = clientes.find((cliente) => cliente.servicoId === servico.id);
    assert.equal(clienteCriado.servicoNome, 'Manicure');
    assert.equal(clienteCriado.servicoValor, 75.5);
    assert.equal(clienteCriado.telefone, '11912345678');
    assert.equal(clienteCriado.idade, 36);

    const respostaClienteComIdade = await fetch(`${baseUrl}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Ana Maria',
        telefone: '98765432',
        idade: 28,
        cep: '12345678',
        servicoId: servico.id
      })
    });
    assert.equal(respostaClienteComIdade.status, 201);
    const clienteComIdade = (await respostaClienteComIdade.json()).cliente;
    assert.equal(clienteComIdade.idade, 28);
    assert.equal(clienteComIdade.dataNascimento, undefined);

    const respostaEdicaoClienteComIdade = await fetch(`${baseUrl}/clientes/${clienteComIdade.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Ana Maria Silva',
        telefone: '98765432',
        idade: 29,
        cep: '12345678',
        servicoId: servico.id
      })
    });
    assert.equal(respostaEdicaoClienteComIdade.status, 200);
    assert.equal((await respostaEdicaoClienteComIdade.json()).cliente.idade, 29);

    const clientesInvalidos = [
      { nome: 'Cliente 123', telefone: '11912345678', idade: 30 },
      { nome: 'Cliente Teste', telefone: 'telefone', idade: 30 },
      { nome: 'Cliente Teste', telefone: '11912345678', idade: 30.5 },
      { nome: 'Cliente Teste', telefone: '11912345678', idade: 121 }
    ];
    for (const dadosInvalidos of clientesInvalidos) {
      const respostaInvalida = await fetch(`${baseUrl}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dadosInvalidos,
          cep: '12345678',
          servicoId: servico.id
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

    const respostaClienteSemServicoOfertado = await fetch(`${baseUrl}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Outro Cliente',
        telefone: '11912345678',
        dataNascimento: '1990-05-20',
        cep: '12345678',
        servicoId: servico.id
      })
    });
    assert.equal(respostaClienteSemServicoOfertado.status, 400);

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
    const respostaListaAtualizada = await fetch(`${baseUrl}/clientes`);
    const clientesAtualizados = await respostaListaAtualizada.json();
    const clienteComServicoAtualizado = clientesAtualizados.find(
      (cliente) => cliente.id === clienteCriado.id
    );
    assert.equal(clienteComServicoAtualizado.servicoNome, 'Manicure atualizada');
    assert.equal(clienteComServicoAtualizado.servicoValor, 80);

    const respostaEdicaoCliente = await fetch(`${baseUrl}/clientes/${clienteCriado.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Cliente Editado',
        telefone: '11987654321',
        dataNascimento: '1991-06-21',
        cep: '87654-321',
        servicoId: servico.id
      })
    });
    assert.equal(respostaEdicaoCliente.status, 200);
    const { cliente: clienteEditado } = await respostaEdicaoCliente.json();
    assert.equal(clienteEditado.nome, 'Cliente Editado');
    assert.equal(clienteEditado.servicoNome, 'Manicure atualizada');

    const respostaEdicaoClienteInvalida = await fetch(`${baseUrl}/clientes/${clienteCriado.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: '<script>alert(1)</script>',
        telefone: '11987654321',
        idade: 35,
        cep: '87654321',
        servicoId: servico.id
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

    const respostaListaAtendimentos = await fetch(`${baseUrl}/atendimentos`);
    const atendimentos = await respostaListaAtendimentos.json();
    assert.deepEqual(atendimentos.map((item) => item.id), [
      atendimentoExistente.id,
      atendimentoNovo.id,
      atendimentoMaisTarde.id
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

    for (const atendimento of [atendimentoExistente, atendimentoNovo, atendimentoMaisTarde]) {
      const respostaRemocaoAtendimento = await fetch(`${baseUrl}/atendimentos/${atendimento.id}`, {
        method: 'DELETE'
      });
      assert.equal(respostaRemocaoAtendimento.status, 200);
    }

    const respostaExclusaoCliente = await fetch(`${baseUrl}/clientes/${clienteCriado.id}`, {
      method: 'DELETE'
    });
    assert.equal(respostaExclusaoCliente.status, 200);
    const respostaExclusaoClienteComIdade = await fetch(`${baseUrl}/clientes/${clienteComIdade.id}`, {
      method: 'DELETE'
    });
    assert.equal(respostaExclusaoClienteComIdade.status, 200);
    const respostaExclusaoServico = await fetch(`${baseUrl}/servicos/${servico.id}`, {
      method: 'DELETE'
    });
    assert.equal(respostaExclusaoServico.status, 200);
  } finally {
    fs.writeFileSync(arquivoClientes, backupClientes);
    fs.writeFileSync(arquivoServicos, backupServicos);
    fs.writeFileSync(arquivoAtendimentos, backupAtendimentos);
    await new Promise((resolve, reject) => {
      servidor.close((erro) => (erro ? reject(erro) : resolve()));
    });
  }
});
