import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const arquivoUsuarios = path.resolve(__dirname, '..', '..', 'data', 'users.json');
const nomeCookieSessao = 'mei_session';
const duracaoSessaoMs = 60 * 60 * 1000;
// Sessões aleatórias ficam no servidor; o navegador recebe apenas o identificador HTTP-only.
const sessoes = new Map();

function lerUsuarios() {
  const usuarios = JSON.parse(fs.readFileSync(arquivoUsuarios, 'utf-8'));
  if (!Array.isArray(usuarios)) {
    throw new Error('O arquivo de usuários deve conter uma lista.');
  }
  return usuarios;
}

function salvarUsuarios(usuarios) {
  fs.writeFileSync(arquivoUsuarios, JSON.stringify(usuarios, null, 2));
}

function normalizarUsuario(usuario, indice) {
  return {
    id: usuario.id ?? Date.now() + indice,
    nome: usuario.nome ?? usuario.user ?? `Usuário ${indice + 1}`,
    email: String(usuario.email ?? usuario.user ?? '').trim().toLowerCase(),
    senha: String(usuario.senha ?? usuario.password ?? '')
  };
}

function obterToken(req) {
  const cookie = req.headers.cookie || '';
  const entrada = cookie.split(';').map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${nomeCookieSessao}=`));
  return entrada ? entrada.slice(nomeCookieSessao.length + 1) : '';
}

function definirCookieSessao(req, res, token) {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${nomeCookieSessao}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${duracaoSessaoMs / 1000}${secure}`
  );
}

function limparCookieSessao(res) {
  res.setHeader(
    'Set-Cookie',
    `${nomeCookieSessao}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`
  );
}

function obterSessao(req) {
  const token = obterToken(req);
  const sessao = sessoes.get(token);
  if (!sessao) return null;

  // Remove sessões vencidas antes de permitir que uma rota protegida as reutilize.
  if (sessao.expiraEm <= Date.now()) {
    sessoes.delete(token);
    return null;
  }

  return { token, sessao };
}

function atualizarAtividade(req, res, sessaoAtiva) {
  // Cada requisição autenticada renova a expiração deslizante de uma hora.
  sessaoAtiva.sessao.expiraEm = Date.now() + duracaoSessaoMs;
  definirCookieSessao(req, res, sessaoAtiva.token);
  res.setHeader('Cache-Control', 'no-store');
}

function senhaJaFoiHashada(senha) {
  return /^\$2[aby]\$\d{2}\$/.test(senha);
}

// Senhas antigas em texto simples são aceitas apenas para migração no próximo login.
async function validarSenha(senhaArmazenada, senhaInformada) {
  if (senhaJaFoiHashada(senhaArmazenada)) {
    return bcrypt.compare(senhaInformada, senhaArmazenada);
  }
  return senhaArmazenada === senhaInformada;
}

function responderErro(res, mensagem, erro) {
  console.error(`${mensagem}:`, erro.message);
  return res.status(500).json({ mensagem });
}

export function exigirAutenticacao(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  const sessaoAtiva = obterSessao(req);
  if (!sessaoAtiva) {
    return res.status(401).json({ mensagem: 'Sua sessão expirou. Entre novamente.' });
  }

  atualizarAtividade(req, res, sessaoAtiva);
  req.usuarioAutenticado = sessaoAtiva.sessao.usuario;
  return next();
}

// Valida a senha, migra credenciais antigas e cria uma sessão aleatória no servidor.
export async function fazerLogin(req, res) {
  const { email, senha } = req.body || {};
  if (typeof email !== 'string' || typeof senha !== 'string' || !email.trim() || !senha) {
    return res.status(400).json({ mensagem: 'Informe o e-mail e a senha.' });
  }

  try {
    const usuariosOriginais = lerUsuarios();
    const usuarios = usuariosOriginais.map(normalizarUsuario);
    const emailDigitado = email.trim().toLowerCase();
    const indiceUsuario = usuarios.findIndex((usuario) => (
      usuario.email === emailDigitado || String(usuario.nome).toLowerCase() === emailDigitado
    ));
    const usuario = usuarios[indiceUsuario];

    if (!usuario || !(await validarSenha(usuario.senha, senha))) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    if (!senhaJaFoiHashada(usuario.senha)) {
      usuario.senha = await bcrypt.hash(senha, 10);
      usuariosOriginais[indiceUsuario] = { ...usuariosOriginais[indiceUsuario], senha: usuario.senha };
      salvarUsuarios(usuariosOriginais);
    }

    const token = randomBytes(32).toString('hex');
    const usuarioPublico = { id: usuario.id, nome: usuario.nome, email: usuario.email };
    sessoes.set(token, { usuario: usuarioPublico, expiraEm: Date.now() + duracaoSessaoMs });
    definirCookieSessao(req, res, token);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ mensagem: 'Login realizado com sucesso.', usuario: usuarioPublico });
  } catch (erro) {
    return responderErro(res, 'Não foi possível autenticar o usuário', erro);
  }
}

export function obterSessaoAtual(req, res) {
  const sessaoAtiva = obterSessao(req);
  if (!sessaoAtiva) {
    return res.status(204).end();
  }

  atualizarAtividade(req, res, sessaoAtiva);
  return res.json({ usuario: sessaoAtiva.sessao.usuario });
}

// Invalida o token no servidor e apaga o cookie enviado ao navegador.
export function fazerLogout(req, res) {
  const token = obterToken(req);
  if (token) sessoes.delete(token);
  limparCookieSessao(res);
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ mensagem: 'Sessão encerrada.' });
}

// Confere a senha atual antes de persistir a nova somente em formato bcrypt.
export async function alterarSenha(req, res) {
  const { email, senhaAtual, novaSenha } = req.body || {};
  if (!email || !senhaAtual || !novaSenha) {
    return res.status(400).json({ mensagem: 'Preencha todos os campos.' });
  }
  if (String(novaSenha).length < 6) {
    return res.status(400).json({ mensagem: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const usuariosOriginais = lerUsuarios();
    const usuarios = usuariosOriginais.map(normalizarUsuario);
    const emailDigitado = String(email).trim().toLowerCase();
    const indiceUsuario = usuarios.findIndex((usuario) => usuario.email === emailDigitado);
    const usuario = usuarios[indiceUsuario];

    if (!usuario || !(await validarSenha(usuario.senha, String(senhaAtual)))) {
      return res.status(401).json({ mensagem: 'E-mail ou senha atual incorretos.' });
    }

    const senhaHash = await bcrypt.hash(String(novaSenha), 10);
    usuariosOriginais[indiceUsuario] = {
      ...usuariosOriginais[indiceUsuario],
      senha: senhaHash
    };
    salvarUsuarios(usuariosOriginais);
    return res.json({ mensagem: 'Senha alterada com sucesso.' });
  } catch (erro) {
    return responderErro(res, 'Não foi possível salvar a nova senha', erro);
  }
}
