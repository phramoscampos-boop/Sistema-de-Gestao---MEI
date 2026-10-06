import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const caminhoArquivoUsuarios = path.join(__dirname, '..', 'data', 'users.json');

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

function validarDadosCadastro({ nome, email, senha }) {
  if (!nome || !email || !senha) {
    return 'Preencha nome, e-mail e senha para continuar.';
  }

  if (String(nome).trim().length < 2) {
    return 'O nome completo deve ter pelo menos 2 caracteres.';
  }

  if (String(email).trim().length < 5) {
    return 'Informe um e-mail válido.';
  }

  if (String(senha).length < 6) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }

  return null;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'html', 'login.html'));
});

app.get('/usuarios', (req, res) => {
  const usuarios = obterUsuariosNormalizados();
  res.json(usuarios);
});

app.post('/usuarios', (req, res) => {
  const { nome, email, senha } = req.body || {};
  const erroValidacao = validarDadosCadastro({ nome, email, senha });

  if (erroValidacao) {
    return res.status(400).json({ mensagem: erroValidacao });
  }

  const usuarios = obterUsuariosNormalizados();
  const emailNormalizado = String(email).trim().toLowerCase();
  const usuarioJaExiste = usuarios.some(
    (usuario) => String(usuario.email).trim().toLowerCase() === emailNormalizado
  );

  if (usuarioJaExiste) {
    return res.status(409).json({ mensagem: 'Este e-mail já está cadastrado.' });
  }

  const novoUsuario = {
    id: Date.now(),
    nome: String(nome).trim(),
    email: emailNormalizado,
    senha: String(senha)
  };

  usuarios.push(novoUsuario);
  salvarUsuariosNoArquivo(usuarios);

  return res.status(201).json({
    mensagem: 'Usuário cadastrado com sucesso!',
    usuario: {
      id: novoUsuario.id,
      nome: novoUsuario.nome,
      email: novoUsuario.email
    }
  });
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

app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');  
});

export { app };
