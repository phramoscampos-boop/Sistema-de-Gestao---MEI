import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { app } from '../src/server.js';

const arquivoClientes = new URL('../data/clientes.json', import.meta.url);
const arquivoServicos = new URL('../data/servicos.json', import.meta.url);

test('cadastra serviços e clientes, e atualiza a oferta do serviço', async () => {
  const backupClientes = fs.readFileSync(arquivoClientes, 'utf-8');
  const backupServicos = fs.readFileSync(arquivoServicos, 'utf-8');
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
    assert.equal(clientes.length, 1);
    assert.equal(clientes[0].servicoNome, 'Manicure');
    assert.equal(clientes[0].servicoValor, 75.5);
    assert.equal(clientes[0].telefone, '11912345678');

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
  } finally {
    fs.writeFileSync(arquivoClientes, backupClientes);
    fs.writeFileSync(arquivoServicos, backupServicos);
    await new Promise((resolve, reject) => {
      servidor.close((erro) => (erro ? reject(erro) : resolve()));
    });
  }
});
