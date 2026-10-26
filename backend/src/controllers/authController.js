import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import {
  criarPerfilPublico,
  emailValido,
  lerUsuarios,
  salvarUsuarios
} from '../services/userService.js';
const nomeCookieSessao = 'mei_session';
const duracaoSessaoMs = 60 * 60 * 1000;
// Sessões aleatórias ficam no servidor; o navegador recebe apenas o identificador HTTP-only.
const sessoes = new Map();

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

export function exigirSenhaAtualizada(req, res, next) {
  if (req.usuarioAutenticado?.precisaAlterarSenha) {
    return res.status(403).json({ mensagem: 'Altere sua senha inicial para continuar.' });
  }
  return next();
}

// Valida a senha, migra credenciais antigas e cria uma sessão aleatória no servidor.
export async function fazerLogin(req, res) {
  const { email, senha } = req.body || {};
  if (typeof email !== 'string' || typeof senha !== 'string' || !email.trim() || !senha) {
    return res.status(400).json({ mensagem: 'Informe o e-mail e a senha.' });
  }

  try {
    const usuarios = lerUsuarios();
    const emailDigitado = email.trim().toLowerCase();
    const indiceUsuario = usuarios.findIndex((usuario) => (
      usuario.email === emailDigitado || String(usuario.nome).toLowerCase() === emailDigitado
    ));
    const usuario = usuarios[indiceUsuario];

    if (!usuario || !usuario.ativo || !(await validarSenha(usuario.senha, senha))) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    if (!senhaJaFoiHashada(usuario.senha)) {
      usuario.senha = await bcrypt.hash(senha, 10);
      salvarUsuarios(usuarios);
    }

    const token = randomBytes(32).toString('hex');
    const usuarioPublico = criarPerfilPublico(usuario);
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
  if (String(novaSenha).length < 5) {
    return res.status(400).json({ mensagem: 'A nova senha deve ter pelo menos 5 caracteres.' });
  }

  try {
    const usuarios = lerUsuarios();
    const emailDigitado = String(email).trim().toLowerCase();
    const indiceUsuario = usuarios.findIndex((usuario) => usuario.email === emailDigitado);
    const usuario = usuarios[indiceUsuario];

    if (!usuario || !(await validarSenha(usuario.senha, String(senhaAtual)))) {
      return res.status(401).json({ mensagem: 'E-mail ou senha atual incorretos.' });
    }

    const senhaHash = await bcrypt.hash(String(novaSenha), 10);
    usuario.senha = senhaHash;
    usuario.precisaAlterarSenha = false;
    salvarUsuarios(usuarios);
    for (const sessao of sessoes.values()) {
      if (String(sessao.usuario.id) === String(usuario.id)) {
        sessao.usuario = criarPerfilPublico(usuario);
      }
    }
    const sessaoAtual = obterSessao(req);
    const podeIrParaDashboard = sessaoAtual &&
      String(sessaoAtual.sessao.usuario.id) === String(usuario.id);
    return res.json({
      mensagem: 'Senha alterada com sucesso.',
      irParaDashboard: Boolean(podeIrParaDashboard)
    });
  } catch (erro) {
    return responderErro(res, 'Não foi possível salvar a nova senha', erro);
  }
}

export async function alterarEmail(req, res) {
  const novoEmail = typeof req.body?.novoEmail === 'string'
    ? req.body.novoEmail.trim().toLowerCase()
    : '';
  const senhaAtual = req.body?.senhaAtual;
  if (!emailValido(novoEmail) || typeof senhaAtual !== 'string' || !senhaAtual) {
    return res.status(400).json({ mensagem: 'Informe um novo e-mail válido e sua senha atual.' });
  }

  try {
    const usuarios = lerUsuarios();
    const usuario = usuarios.find(
      (item) => String(item.id) === String(req.usuarioAutenticado.id)
    );
    if (!usuario || !usuario.ativo || !(await validarSenha(usuario.senha, senhaAtual))) {
      return res.status(401).json({ mensagem: 'Sua senha atual está incorreta.' });
    }
    if (usuarios.some((item) => String(item.id) !== String(usuario.id) && item.email === novoEmail)) {
      return res.status(409).json({ mensagem: 'Já existe uma conta com esse e-mail.' });
    }

    usuario.email = novoEmail;
    salvarUsuarios(usuarios);
    const usuarioPublico = criarPerfilPublico(usuario);
    for (const sessao of sessoes.values()) {
      if (String(sessao.usuario.id) === String(usuario.id)) {
        sessao.usuario = usuarioPublico;
      }
    }
    return res.json({ mensagem: 'E-mail alterado com sucesso.', usuario: usuarioPublico });
  } catch (erro) {
    return responderErro(res, 'Não foi possível alterar o e-mail', erro);
  }
}

export function exigirGestaoUsuarios(req, res, next) {
  if (!req.usuarioAutenticado?.podeGerenciarUsuarios) {
    return res.status(403).json({ mensagem: 'Você não tem permissão para gerenciar usuários.' });
  }
  return next();
}

export function listarUsuarios(req, res) {
  try {
    return res.json(lerUsuarios().map(criarPerfilPublico));
  } catch (erro) {
    return responderErro(res, 'Não foi possível carregar os usuários', erro);
  }
}

export async function cadastrarUsuario(req, res) {
  const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim().replace(/\s+/g, ' ') : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const papel = req.body?.papel || 'usuario';
  if (nome.length < 2 || !emailValido(email) ||
      !['usuario', 'administrador'].includes(papel)) {
    return res.status(400).json({ mensagem: 'Informe nome, e-mail válido e um cargo permitido.' });
  }

  try {
    const usuarios = lerUsuarios();
    if (usuarios.some((usuario) => usuario.email === email)) {
      return res.status(409).json({ mensagem: 'Já existe uma conta com esse e-mail.' });
    }

    const usuario = {
      id: randomBytes(16).toString('hex'),
      nome,
      email,
      senha: await bcrypt.hash('12345', 10),
      papel,
      podeGerenciarUsuarios: false,
      precisaAlterarSenha: true,
      ativo: true,
      criadoEm: new Date().toISOString()
    };
    usuarios.push(usuario);
    salvarUsuarios(usuarios);
    return res.status(201).json({
      mensagem: 'Usuário cadastrado com a senha padrão. A troca será exigida no primeiro acesso.',
      usuario: criarPerfilPublico(usuario),
      senhaTemporaria: '12345'
    });
  } catch (erro) {
    return responderErro(res, 'Não foi possível cadastrar o usuário', erro);
  }
}

export function alterarPapelUsuario(req, res) {
  const { papel } = req.body || {};
  if (!['usuario', 'administrador'].includes(papel)) {
    return res.status(400).json({ mensagem: 'Selecione um cargo válido.' });
  }

  try {
    const usuarios = lerUsuarios();
    const usuario = usuarios.find((item) => String(item.id) === req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }
    if (usuario.podeGerenciarUsuarios) {
      return res.status(403).json({ mensagem: 'O cargo das contas privilegiadas não pode ser alterado.' });
    }

    usuario.papel = papel;
    salvarUsuarios(usuarios);
    for (const sessao of sessoes.values()) {
      if (String(sessao.usuario.id) === String(usuario.id)) {
        sessao.usuario = criarPerfilPublico(usuario);
      }
    }
    return res.json({ mensagem: 'Cargo atualizado.', usuario: criarPerfilPublico(usuario) });
  } catch (erro) {
    return responderErro(res, 'Não foi possível atualizar o cargo', erro);
  }
}

export async function resetarSenhaUsuario(req, res) {
  try {
    const usuarios = lerUsuarios();
    const usuario = usuarios.find((item) => String(item.id) === req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    usuario.senha = await bcrypt.hash('12345', 10);
    usuario.precisaAlterarSenha = true;
    salvarUsuarios(usuarios);
    for (const sessao of sessoes.values()) {
      if (String(sessao.usuario.id) === String(usuario.id)) {
        sessao.usuario = criarPerfilPublico(usuario);
      }
    }
    return res.json({
      mensagem: `Senha de ${usuario.nome} redefinida para 12345. A troca será exigida no próximo acesso.`,
      usuario: criarPerfilPublico(usuario),
      redirecionarParaTroca: String(usuario.id) === String(req.usuarioAutenticado.id)
    });
  } catch (erro) {
    return responderErro(res, 'Não foi possível redefinir a senha', erro);
  }
}

export function excluirUsuario(req, res) {
  try {
    const usuarios = lerUsuarios();
    const indice = usuarios.findIndex((item) => String(item.id) === req.params.id);
    if (indice === -1) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }
    const usuario = usuarios[indice];
    if (usuario.podeGerenciarUsuarios ||
        String(usuario.id) === String(req.usuarioAutenticado.id)) {
      return res.status(403).json({ mensagem: 'As contas privilegiadas não podem ser removidas.' });
    }

    usuarios.splice(indice, 1);
    salvarUsuarios(usuarios);
    for (const [token, sessao] of sessoes) {
      if (String(sessao.usuario.id) === String(usuario.id)) sessoes.delete(token);
    }
    return res.json({ mensagem: 'Usuário excluído.' });
  } catch (erro) {
    return responderErro(res, 'Não foi possível excluir o usuário', erro);
  }
}

export async function criarProprietariaInicial(nome, email) {
  const nomeNormalizado = String(nome || '').trim().replace(/\s+/g, ' ');
  const emailNormalizado = String(email || '').trim().toLowerCase();
  if (nomeNormalizado.length < 2 || !emailValido(emailNormalizado)) {
    throw new Error('Informe um nome e um e-mail válidos para a proprietária.');
  }

  const usuarios = lerUsuarios({ migrarLegados: true });
  if (usuarios.some((usuario) => usuario.papel === 'proprietaria')) {
    throw new Error('Já existe uma conta proprietária.');
  }
  if (usuarios.some((usuario) => usuario.email === emailNormalizado)) {
    throw new Error('Já existe uma conta com esse e-mail.');
  }

  const usuario = {
    id: randomBytes(16).toString('hex'),
    nome: nomeNormalizado,
    email: emailNormalizado,
    senha: await bcrypt.hash('12345', 10),
    papel: 'proprietaria',
    podeGerenciarUsuarios: true,
    precisaAlterarSenha: true,
    ativo: true,
    criadoEm: new Date().toISOString()
  };
  usuarios.push(usuario);
  salvarUsuarios(usuarios);
  return { usuario: criarPerfilPublico(usuario), senhaTemporaria: '12345' };
}
