import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const caminhoArquivoUsuarios = path.join(__dirname, '..', 'data', 'users.json');
const caminhoArquivoClientes = path.join(__dirname, '..', 'data', 'clientes.json');
const caminhoArquivoServicos = path.join(__dirname, '..', 'data', 'servicos.json');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

function lerUsuariosDoArquivo() {
  try {
    const conteudo = fs.readFileSync(caminhoArquivoUsuarios, 'utf-8');
    const usuarios = JSON.parse(conteudo);

    if (!Array.isArray(usuarios)) {
      return [];
    }

    return usuarios;
  } catch (erro) {
    console.error('Não foi possível ler o arquivo de usuários:', erro.message);
    return [];
  }
}

function salvarUsuariosNoArquivo(usuarios) {
  fs.writeFileSync(caminhoArquivoUsuarios, JSON.stringify(usuarios, null, 2));
}

// Lê e persiste cadastros em arquivos separados para mantê-los disponíveis após reiniciar o servidor.
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

function responderErroDeArquivo(res, erro, tipo) {
  console.error(`Não foi possível acessar os dados de ${tipo}:`, erro.message);
  return res.status(500).json({ mensagem: `Não foi possível acessar os dados de ${tipo}.` });
}

function apenasDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function normalizarUsuario(usuario, indice) {
  const nome = usuario.nome ?? usuario.user ?? `Usuário ${indice + 1}`;
  const email = usuario.email ?? usuario.user ?? '';
  const senha = usuario.senha ?? usuario.password ?? '';
  const id = usuario.id ?? Date.now() + indice;

  return {
    id,
    nome,
    email: String(email).trim().toLowerCase(),
    senha: String(senha)
  };
}

function obterUsuariosNormalizados() {
  const usuarios = lerUsuariosDoArquivo();
  return usuarios.map(normalizarUsuario);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'html', 'login.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'html', 'dashboard.html'));
});

app.post('/login', (req, res) => {
  const { email, senha } = req.body || {};

  if (!email || !senha) {
    return res.status(400).json({ mensagem: 'Informe o e-mail e a senha.' });
  }

  const usuarios = obterUsuariosNormalizados();
  const emailDigitado = String(email).trim().toLowerCase();
  const senhaDigitada = String(senha);

  const usuarioEncontrado = usuarios.find((usuario) => {
    const emailUsuario = String(usuario.email || '').trim().toLowerCase();
    return (
      (emailUsuario === emailDigitado || usuario.nome === emailDigitado) &&
      String(usuario.senha) === senhaDigitada
    );
  });

  if (!usuarioEncontrado) {
    return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
  }

  const { senha: senhaDoUsuario, ...dadosUsuario } = usuarioEncontrado;

  return res.json({
    mensagem: 'Login realizado com sucesso!',
    usuario: dadosUsuario
  });
});

// A troca só altera a senha de uma conta existente após validar a senha atual.
app.post('/alterar-senha', (req, res) => {
  const { email, senhaAtual, novaSenha } = req.body || {};

  if (!email || !senhaAtual || !novaSenha) {
    return res.status(400).json({ mensagem: 'Preencha todos os campos.' });
  }

  if (String(novaSenha).length < 6) {
    return res.status(400).json({ mensagem: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  const usuarios = obterUsuariosNormalizados();
  const emailDigitado = String(email).trim().toLowerCase();
  const usuarioEncontrado = usuarios.find(
    (usuario) => String(usuario.email).trim().toLowerCase() === emailDigitado
  );

  // A mesma resposta evita revelar se um e-mail está cadastrado.
  if (!usuarioEncontrado || String(usuarioEncontrado.senha) !== String(senhaAtual)) {
    return res.status(401).json({ mensagem: 'E-mail ou senha atual incorretos.' });
  }

  usuarioEncontrado.senha = String(novaSenha);

  try {
    salvarUsuariosNoArquivo(usuarios);
  } catch (erro) {
    console.error('Não foi possível salvar a nova senha:', erro.message);
    return res.status(500).json({ mensagem: 'Não foi possível salvar a nova senha.' });
  }

  return res.json({ mensagem: 'Senha alterada com sucesso.' });
});

app.get('/clientes', (req, res) => {
  try {
    return res.json(lerRegistros(caminhoArquivoClientes, 'clientes'));
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'clientes');
  }
});

app.post('/clientes', (req, res) => {
  const { nome, telefone, dataNascimento, cep, servicoId } = req.body || {};
  const nomeNormalizado = String(nome || '').trim();
  const telefoneNormalizado = apenasDigitos(telefone);
  const cepNormalizado = apenasDigitos(cep);

  if (!nomeNormalizado || !telefoneNormalizado || !dataNascimento || !cepNormalizado || !servicoId) {
    return res.status(400).json({ mensagem: 'Preencha todos os dados do cliente e escolha um serviço.' });
  }

  if (telefoneNormalizado.length < 10 || telefoneNormalizado.length > 11) {
    return res.status(400).json({ mensagem: 'Informe um telefone com DDD válido.' });
  }

  if (cepNormalizado.length !== 8) {
    return res.status(400).json({ mensagem: 'Informe um CEP com 8 números.' });
  }

  const dataNascimentoTexto = String(dataNascimento);
  const partesData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataNascimentoTexto);
  const [anoNascimento, mesNascimento, diaNascimento] = partesData
    ? partesData.slice(1).map(Number)
    : [];
  const fimDoMes = new Date(0);
  fimDoMes.setUTCFullYear(anoNascimento, mesNascimento, 0);
  const dataValida = Boolean(partesData) &&
    mesNascimento >= 1 && mesNascimento <= 12 &&
    diaNascimento >= 1 && diaNascimento <= fimDoMes.getUTCDate();
  if (!dataValida) {
    return res.status(400).json({ mensagem: 'Informe uma data de nascimento válida.' });
  }

  try {
    const servicos = lerRegistros(caminhoArquivoServicos, 'serviços');
    const servico = servicos.find(
      (item) => String(item.id) === String(servicoId) &&
        item.ofertado === true &&
        Number.isSafeInteger(Math.round(Number(item.valor) * 100)) &&
        Number(item.valor) > 0
    );

    if (!servico) {
      return res.status(400).json({ mensagem: 'O serviço selecionado não está disponível.' });
    }

    const clientes = lerRegistros(caminhoArquivoClientes, 'clientes');
    const novoCliente = {
      id: randomUUID(),
      nome: nomeNormalizado,
      telefone: telefoneNormalizado,
      dataNascimento: String(dataNascimento),
      cep: cepNormalizado,
      servicoId: servico.id,
      servicoNome: servico.nome,
      servicoValor: servico.valor,
      criadoEm: new Date().toISOString()
    };

    clientes.push(novoCliente);
    salvarRegistros(caminhoArquivoClientes, clientes);
    return res.status(201).json({ mensagem: 'Cliente cadastrado com sucesso.', cliente: novoCliente });
  } catch (erro) {
    return responderErroDeArquivo(res, erro, 'clientes ou serviços');
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
      ofertado: true
    };

    servicos.push(novoServico);
    salvarRegistros(caminhoArquivoServicos, servicos);
    return res.status(201).json({ mensagem: 'Serviço cadastrado com sucesso.', servico: novoServico });
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

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
  });
}

export { app };
