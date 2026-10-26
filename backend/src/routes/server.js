import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import {
  alterarSenha,
  alterarPapelUsuario,
  alterarEmail,
  cadastrarUsuario,
  excluirUsuario,
  exigirAutenticacao,
  exigirGestaoUsuarios,
  exigirSenhaAtualizada,
  fazerLogin,
  fazerLogout,
  listarUsuarios,
  obterSessaoAtual,
  resetarSenhaUsuario
} from '../controllers/authController.js';
import { atualizarHorarios, obterHorarios } from '../controllers/settingsController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve dados e arquivos estáticos pelas raízes do projeto, sem depender da pasta deste arquivo.
const raizBackend = path.resolve(__dirname, '..', '..');
const raizFrontend = path.resolve(raizBackend, '..', 'frontend');
const caminhoArquivoClientes = path.join(raizBackend, 'data', 'clientes.json');
const caminhoArquivoServicos = path.join(raizBackend, 'data', 'servicos.json');
const caminhoArquivoAtendimentos = path.join(raizBackend, 'data', 'atendimentos.json');

const app = express();

app.use(cors());
app.use(express.json());

// Serve a página de login sem autenticação e protege a dashboard antes do static middleware.
app.get('/', (req, res) => {
  res.sendFile(path.join(raizFrontend, 'html', 'login.html'));
});

app.get(['/dashboard.html', '/html/dashboard.html'], exigirAutenticacao, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.usuarioAutenticado.precisaAlterarSenha) {
    return res.redirect('/html/alterar-senha.html');
  }
  res.sendFile(path.join(raizFrontend, 'html', 'dashboard.html'));
});

app.post('/login', fazerLogin);
app.get('/auth/session', obterSessaoAtual);
app.post('/logout', fazerLogout);
app.post('/alterar-senha', alterarSenha);
app.post('/alterar-email', exigirAutenticacao, exigirSenhaAtualizada, alterarEmail);

app.use(express.static(raizFrontend, { index: false }));

// Todas as rotas que leem ou alteram os cadastros exigem uma sessão válida.
app.use(
  ['/clientes', '/servicos', '/atendimentos', '/configuracoes'],
  exigirAutenticacao,
  exigirSenhaAtualizada
);

app.get('/usuarios', exigirAutenticacao, exigirSenhaAtualizada, exigirGestaoUsuarios, listarUsuarios);
app.post('/usuarios', exigirAutenticacao, exigirSenhaAtualizada, exigirGestaoUsuarios, cadastrarUsuario);
app.patch('/usuarios/:id/papel', exigirAutenticacao, exigirSenhaAtualizada, exigirGestaoUsuarios, alterarPapelUsuario);
app.post('/usuarios/:id/reset-senha', exigirAutenticacao, exigirSenhaAtualizada, exigirGestaoUsuarios, resetarSenhaUsuario);
app.delete('/usuarios/:id', exigirAutenticacao, exigirSenhaAtualizada, exigirGestaoUsuarios, excluirUsuario);
app.get('/configuracoes/horarios', obterHorarios);
app.put('/configuracoes/horarios', exigirGestaoUsuarios, atualizarHorarios);

// Lê cada coleção JSON e rejeita arquivos malformados em vez de ocultar dados corrompidos.
function lerRegistros(caminhoArquivo, tipo) {
  const conteudo = fs.readFileSync(caminhoArquivo, 'utf-8');
  const registros = JSON.parse(conteudo);

  if (!Array.isArray(registros)) {
    throw new Error(`O arquivo de ${tipo} deve conter uma lista.`);
  }

  return registros;
}

function salvarRegistros(caminhoArquivo, registros) {
  fs.writeFileSync(caminhoArquivo, JSON.stringify(registros, null, 2));
}

// Registra falhas de armazenamento e responde com erro consistente sem expor detalhes do disco.
function responderErroDeArquivo(res, erro, tipo) {
  console.error(`Não foi possível acessar os dados de ${tipo}:`, erro.message);
  return res.status(500).json({ mensagem: `Não foi possível acessar os dados de ${tipo}.` });
}

function apenasDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function validarNomeCliente(valor) {
  if (typeof valor !== 'string') return null;
  const nome = valor.trim().normalize('NFC').replace(/\s+/g, ' ');
  return /^[\p{L}]+(?: [\p{L}]+)*$/u.test(nome) ? nome : null;
}

function validarTelefoneCliente(valor) {
  if (typeof valor !== 'string' || !/^[\d()\s-]+$/.test(valor.trim())) return null;
  const telefone = apenasDigitos(valor);
  return [8, 9, 10, 11].includes(telefone.length) ? telefone : null;
}

function validarIdade(valor) {
  if (typeof valor !== 'number' && typeof valor !== 'string') return null;
  if (typeof valor === 'string' && !/^\d{1,3}$/.test(valor)) return null;
  const idade = Number(valor);
  return Number.isInteger(idade) && idade >= 1 && idade <= 120 ? idade : null;
}

function validarCep(valor) {
  if (typeof valor !== 'string' || !/^[\d\s-]+$/.test(valor.trim())) return null;
  const cep = apenasDigitos(valor);
  return cep.length === 8 ? cep : null;
}

function calcularIdade(dataNascimento) {
  // O padrão ISO exige quatro dígitos no ano e rejeita datas impossíveis do calendário.
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dataNascimento || ''));
  if (!partes) return null;
  const [, ano, mes, dia] = partes.map(Number);
  const data = new Date(ano, mes - 1, dia);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() < mes - 1 || (hoje.getMonth() === mes - 1 && hoje.getDate() < dia)) idade--;
  return idade >= 1 && idade <= 120 ? idade : null;
}

function validarDataAtendimento(data, horario) {
  const partesData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(data || ''));
  const partesHorario = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(horario || ''));
  if (!partesData || !partesHorario) return false;
  const [, ano, mes, dia] = partesData.map(Number);
  const [, hora, minuto] = partesHorario.map(Number);
  const dataLocal = new Date(ano, mes - 1, dia, hora, minuto);
  if (dataLocal.getFullYear() !== ano || dataLocal.getMonth() !== mes - 1 ||
      dataLocal.getDate() !== dia || dataLocal.getHours() !== hora || dataLocal.getMinutes() !== minuto) {
    return false;
  }
  return dataLocal.getTime() >= Date.now();
}

const statusAtendimentoValidos = ['aguardando', 'em atendimento', 'concluído', 'cancelado'];

// O CRUD de clientes guarda apenas dados pessoais/de contato; serviços são escolhidos na fila.
app.get('/clientes', (req, res) => {
  try {
    return res.json(lerRegistros(caminhoArquivoClientes, 'clientes'));
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'clientes');
  }
});

app.post('/clientes', (req, res) => {
  const { nome, telefone, dataNascimento, cep } = req.body || {};
  const nomeNormalizado = validarNomeCliente(nome);
  const telefoneNormalizado = validarTelefoneCliente(telefone);
  const idadeNormalizada = calcularIdade(dataNascimento);
  const cepNormalizado = validarCep(cep);

  if (!nomeNormalizado) {
    return res.status(400).json({ mensagem: 'Informe um nome válido, usando apenas letras e espaços.' });
  }
  if (!telefoneNormalizado) {
    return res.status(400).json({ mensagem: 'Informe um telefone válido com 8 ou 9 dígitos, com ou sem DDD.' });
  }
  if (!idadeNormalizada) {
    return res.status(400).json({ mensagem: 'Informe uma data de nascimento válida.' });
  }
  if (!cepNormalizado) {
    return res.status(400).json({ mensagem: 'Preencha o CEP com 8 números.' });
  }

  try {
    const clientes = lerRegistros(caminhoArquivoClientes, 'clientes');
    const novoCliente = {
      id: randomUUID(),
      nome: nomeNormalizado,
      telefone: telefoneNormalizado,
      idade: idadeNormalizada,
      dataNascimento,
      cep: cepNormalizado,
      criadoEm: new Date().toISOString()
    };

    clientes.push(novoCliente);
    salvarRegistros(caminhoArquivoClientes, clientes);
    return res.status(201).json({ mensagem: 'Cliente cadastrado com sucesso.', cliente: novoCliente });
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'clientes');
  }
});

app.put('/clientes/:id', (req, res) => {
  const { nome, telefone, dataNascimento, cep } = req.body || {};
  const nomeNormalizado = validarNomeCliente(nome);
  const telefoneNormalizado = validarTelefoneCliente(telefone);
  const idadeCalculada = dataNascimento === undefined ? null : calcularIdade(dataNascimento);
  const cepNormalizado = validarCep(cep);

  if (!nomeNormalizado) {
    return res.status(400).json({ mensagem: 'Informe um nome válido, usando apenas letras e espaços.' });
  }
  if (!telefoneNormalizado) {
    return res.status(400).json({ mensagem: 'Informe um telefone válido com 8 ou 9 dígitos, com ou sem DDD.' });
  }
  if (dataNascimento !== undefined && !idadeCalculada) {
    return res.status(400).json({ mensagem: 'Informe uma data de nascimento válida.' });
  }
  if (!cepNormalizado) {
    return res.status(400).json({ mensagem: 'Preencha o CEP com 8 números.' });
  }

  try {
    const clientes = lerRegistros(caminhoArquivoClientes, 'clientes');
    const cliente = clientes.find((item) => String(item.id) === req.params.id);
    if (!cliente) {
      return res.status(404).json({ mensagem: 'Cliente não encontrado.' });
    }

    const idadeNormalizada = dataNascimento === undefined && !cliente.dataNascimento
      ? validarIdade(cliente.idade)
      : idadeCalculada;
    if (!idadeNormalizada) {
      return res.status(400).json({ mensagem: 'Informe uma data de nascimento válida.' });
    }

    Object.assign(cliente, {
      nome: nomeNormalizado,
      telefone: telefoneNormalizado,
      idade: idadeNormalizada,
      cep: cepNormalizado
    });
    if (dataNascimento !== undefined) cliente.dataNascimento = dataNascimento;
    delete cliente.servicoId;
    delete cliente.servicoNome;
    delete cliente.servicoValor;
    salvarRegistros(caminhoArquivoClientes, clientes);
    return res.json({ mensagem: 'Cliente atualizado com sucesso.', cliente });
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'clientes');
  }
});

app.delete('/clientes/:id', (req, res) => {
  try {
    const clientes = lerRegistros(caminhoArquivoClientes, 'clientes');
    const indice = clientes.findIndex((item) => String(item.id) === req.params.id);
    if (indice === -1) {
      return res.status(404).json({ mensagem: 'Cliente não encontrado.' });
    }

    clientes.splice(indice, 1);
    salvarRegistros(caminhoArquivoClientes, clientes);
    return res.json({ mensagem: 'Cliente excluído com sucesso.' });
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'clientes');
  }
});

// A fila guarda os dados do serviço no atendimento para preservar o histórico após alterações.
app.get('/atendimentos', (req, res) => {
  try {
    const atendimentos = lerRegistros(caminhoArquivoAtendimentos, 'atendimentos');
    atendimentos.sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`));
    return res.json(atendimentos);
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'atendimentos');
  }
});

app.post('/atendimentos', (req, res) => {
  const dados = req.body || {};
  const nome = validarNomeCliente(dados.nome);
  const telefone = validarTelefoneCliente(dados.telefone);
  const idade = validarIdade(dados.idade);
  const { data, horario, servicoId } = dados;

  if (!validarDataAtendimento(data, horario)) {
    return res.status(400).json({ mensagem: 'Informe uma data e um horário futuros válidos.' });
  }
  if (!nome || !telefone || !idade || !servicoId) {
    return res.status(400).json({ mensagem: 'Preencha nome, telefone, idade e serviço para o atendimento.' });
  }

  try {
    const servicos = lerRegistros(caminhoArquivoServicos, 'serviços');
    const servico = servicos.find(
      (item) => String(item.id) === String(servicoId) && item.ofertado === true
    );
    if (!servico) {
      return res.status(400).json({ mensagem: 'O serviço selecionado não está disponível.' });
    }

    const clientes = lerRegistros(caminhoArquivoClientes, 'clientes');
    const cliente = dados.clienteId
      ? clientes.find((item) => String(item.id) === String(dados.clienteId))
      : clientes.find((item) => apenasDigitos(item.telefone) === telefone);
    if (dados.clienteId && !cliente) {
      return res.status(404).json({ mensagem: 'O cliente selecionado não foi encontrado.' });
    }

    const atendimentos = lerRegistros(caminhoArquivoAtendimentos, 'atendimentos');
    const conflito = atendimentos.find(
      (item) => item.data === data && item.horario === horario &&
        !['concluído', 'cancelado'].includes(item.status)
    );
    if (conflito && dados.confirmarConflito !== true) {
      return res.status(409).json({
        mensagem: `Já existe um atendimento às ${horario} em ${data}. Deseja agendar mesmo assim?`
      });
    }

    const nomeFinal = cliente ? validarNomeCliente(cliente.nome) : nome;
    const telefoneFinal = cliente ? validarTelefoneCliente(cliente.telefone) : telefone;
    const idadeFinal = cliente
      ? validarIdade(cliente.idade) || calcularIdade(cliente.dataNascimento)
      : idade;
    if (!nomeFinal || !telefoneFinal || !idadeFinal) {
      return res.status(400).json({ mensagem: 'Os dados do cliente selecionado precisam ser corrigidos antes do agendamento.' });
    }

    const atendimento = {
      id: randomUUID(),
      clienteId: cliente?.id ?? null,
      nome: nomeFinal,
      telefone: telefoneFinal,
      idade: idadeFinal,
      data,
      horario,
      servicoId: servico.id,
      servicoNome: servico.nome,
      status: 'aguardando',
      criadoEm: new Date().toISOString()
    };
    atendimentos.push(atendimento);
    salvarRegistros(caminhoArquivoAtendimentos, atendimentos);
    return res.status(201).json({ mensagem: 'Atendimento adicionado à fila.', atendimento });
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'atendimentos, clientes ou serviços');
  }
});

app.put('/atendimentos/:id', (req, res) => {
  const dados = req.body || {};
  const nome = validarNomeCliente(dados.nome);
  const telefone = validarTelefoneCliente(dados.telefone);
  const idade = validarIdade(dados.idade);
  const { data, horario, servicoId, status } = dados;

  if (!validarDataAtendimento(data, horario)) {
    return res.status(400).json({ mensagem: 'Informe uma data e um horário futuros válidos.' });
  }
  if (!nome || !telefone || !idade || !servicoId || !statusAtendimentoValidos.includes(status)) {
    return res.status(400).json({ mensagem: 'Preencha os dados do cliente, serviço e status válidos.' });
  }

  try {
    const servicos = lerRegistros(caminhoArquivoServicos, 'serviços');
    const servico = servicos.find(
      (item) => String(item.id) === String(servicoId) && item.ofertado === true
    );
    if (!servico) {
      return res.status(400).json({ mensagem: 'O serviço selecionado não está disponível.' });
    }

    const atendimentos = lerRegistros(caminhoArquivoAtendimentos, 'atendimentos');
    const atendimento = atendimentos.find((item) => String(item.id) === req.params.id);
    if (!atendimento) {
      return res.status(404).json({ mensagem: 'Atendimento não encontrado.' });
    }

    const conflito = atendimentos.find(
      (item) => item.id !== atendimento.id && item.data === data && item.horario === horario &&
        !['concluído', 'cancelado'].includes(item.status) &&
        status !== 'concluído' && status !== 'cancelado'
    );
    if (conflito && dados.confirmarConflito !== true) {
      return res.status(409).json({
        mensagem: `Já existe um atendimento às ${horario} em ${data}. Deseja salvar mesmo assim?`
      });
    }

    Object.assign(atendimento, {
      nome,
      telefone,
      idade,
      data,
      horario,
      servicoId: servico.id,
      servicoNome: servico.nome,
      status
    });
    if (dados.clienteId !== undefined) atendimento.clienteId = dados.clienteId || null;
    salvarRegistros(caminhoArquivoAtendimentos, atendimentos);
    return res.json({ mensagem: 'Atendimento atualizado.', atendimento });
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'atendimentos ou serviços');
  }
});

app.patch('/atendimentos/:id/status', (req, res) => {
  const { status, confirmarConflito } = req.body || {};
  if (!statusAtendimentoValidos.includes(status)) {
    return res.status(400).json({ mensagem: 'Selecione um status válido para o atendimento.' });
  }

  try {
    const atendimentos = lerRegistros(caminhoArquivoAtendimentos, 'atendimentos');
    const atendimento = atendimentos.find((item) => String(item.id) === req.params.id);
    if (!atendimento) {
      return res.status(404).json({ mensagem: 'Atendimento não encontrado.' });
    }
    if (!['concluído', 'cancelado'].includes(status)) {
      const conflito = atendimentos.find(
        (item) => item.id !== atendimento.id && item.data === atendimento.data &&
          item.horario === atendimento.horario &&
          !['concluído', 'cancelado'].includes(item.status)
      );
      if (conflito && confirmarConflito !== true) {
        return res.status(409).json({
          mensagem: `Já existe outro atendimento às ${atendimento.horario} em ${atendimento.data}. Deseja alterar o status mesmo assim?`
        });
      }
    }
    atendimento.status = status;
    salvarRegistros(caminhoArquivoAtendimentos, atendimentos);
    return res.json({ mensagem: 'Status do atendimento atualizado.', atendimento });
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'atendimentos');
  }
});

app.delete('/atendimentos/:id', (req, res) => {
  try {
    const atendimentos = lerRegistros(caminhoArquivoAtendimentos, 'atendimentos');
    const indice = atendimentos.findIndex((item) => String(item.id) === req.params.id);
    if (indice === -1) {
      return res.status(404).json({ mensagem: 'Atendimento não encontrado.' });
    }
    atendimentos.splice(indice, 1);
    salvarRegistros(caminhoArquivoAtendimentos, atendimentos);
    return res.json({ mensagem: 'Atendimento removido da fila.' });
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'atendimentos');
  }
});

app.get('/servicos', (req, res) => {
  try {
    return res.json(lerRegistros(caminhoArquivoServicos, 'serviços'));
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'serviços');
  }
});

app.post('/servicos', (req, res) => {
  const { nome, duracaoMinutos, valor } = req.body || {};
  const nomeNormalizado = String(nome || '').trim();
  const duracao = Number(duracaoMinutos);
  const valorNormalizado = Number(valor);

  if (!nomeNormalizado || !Number.isInteger(duracao) || duracao < 1) {
    return res.status(400).json({ mensagem: 'Informe o nome do serviço e uma duração em minutos maior que zero.' });
  }

  const valorEmCentavos = Math.round(valorNormalizado * 100);
  if (!Number.isFinite(valorNormalizado) || !Number.isSafeInteger(valorEmCentavos) || valorEmCentavos <= 0) {
    return res.status(400).json({ mensagem: 'Informe um valor de oferta maior que zero.' });
  }

  try {
    const servicos = lerRegistros(caminhoArquivoServicos, 'serviços');
    const novoServico = {
      id: randomUUID(),
      nome: nomeNormalizado,
      duracaoMinutos: duracao,
      valor: valorEmCentavos / 100,
      ofertado: true,
      criadoEm: new Date().toISOString()
    };

    servicos.push(novoServico);
    salvarRegistros(caminhoArquivoServicos, servicos);
    return res.status(201).json({ mensagem: 'Serviço cadastrado com sucesso.', servico: novoServico });
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'serviços');
  }
});

app.put('/servicos/:id', (req, res) => {
  const { nome, duracaoMinutos, valor } = req.body || {};
  const nomeNormalizado = String(nome || '').trim();
  const duracao = Number(duracaoMinutos);
  const valorNormalizado = Number(valor);
  const valorEmCentavos = Math.round(valorNormalizado * 100);

  if (!nomeNormalizado || !Number.isInteger(duracao) || duracao < 1) {
    return res.status(400).json({ mensagem: 'Informe o nome do serviço e uma duração em minutos maior que zero.' });
  }
  if (!Number.isFinite(valorNormalizado) || !Number.isSafeInteger(valorEmCentavos) || valorEmCentavos <= 0) {
    return res.status(400).json({ mensagem: 'Informe um valor de oferta maior que zero.' });
  }

  try {
    const servicos = lerRegistros(caminhoArquivoServicos, 'serviços');
    const servico = servicos.find((item) => String(item.id) === req.params.id);
    if (!servico) {
      return res.status(404).json({ mensagem: 'Serviço não encontrado.' });
    }

    Object.assign(servico, {
      nome: nomeNormalizado,
      duracaoMinutos: duracao,
      valor: valorEmCentavos / 100
    });
    salvarRegistros(caminhoArquivoServicos, servicos);
    return res.json({ mensagem: 'Serviço atualizado com sucesso.', servico });
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'serviços');
  }
});

app.delete('/servicos/:id', (req, res) => {
  try {
    const servicos = lerRegistros(caminhoArquivoServicos, 'serviços');
    const indice = servicos.findIndex((item) => String(item.id) === req.params.id);
    if (indice === -1) {
      return res.status(404).json({ mensagem: 'Serviço não encontrado.' });
    }

    servicos.splice(indice, 1);
    salvarRegistros(caminhoArquivoServicos, servicos);
    return res.json({ mensagem: 'Serviço excluído com sucesso.' });
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'serviços');
  }
});

app.patch('/servicos/:id/oferta', (req, res) => {
  const { ofertado } = req.body || {};
  if (typeof ofertado !== 'boolean') {
    return res.status(400).json({ mensagem: 'Informe se o serviço está sendo ofertado.' });
  }

  try {
    const servicos = lerRegistros(caminhoArquivoServicos, 'serviços');
    const servico = servicos.find((item) => String(item.id) === req.params.id);

    if (!servico) {
      return res.status(404).json({ mensagem: 'Serviço não encontrado.' });
    }

    servico.ofertado = ofertado;
    salvarRegistros(caminhoArquivoServicos, servicos);
    return res.json({ mensagem: 'Disponibilidade do serviço atualizada.', servico });
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'serviços');
  }
});

app.use((erro, req, res, next) => {
  if (res.headersSent) return next(erro);
  if (erro instanceof SyntaxError && erro.status === 400 && 'body' in erro) {
    return res.status(400).json({ mensagem: 'O conteúdo enviado não é um JSON válido.' });
  }
  console.error('Erro inesperado na requisição:', erro.message);
  return res.status(500).json({ mensagem: 'Não foi possível processar a requisição.' });
});

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
  });
}

export { app };
