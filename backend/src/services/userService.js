import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const arquivoUsuarios = path.resolve(__dirname, '..', '..', 'data', 'users.json');

const papeisValidos = ['proprietaria', 'administrador', 'usuario'];

export function lerUsuarios({ migrarLegados = false } = {}) {
  const usuarios = JSON.parse(fs.readFileSync(arquivoUsuarios, 'utf-8'));
  if (!Array.isArray(usuarios)) {
    throw new Error('O arquivo de usuários deve conter uma lista.');
  }

  return usuarios.map((usuario, indice) => normalizarUsuario(usuario, indice, migrarLegados));
}

export function salvarUsuarios(usuarios) {
  fs.writeFileSync(arquivoUsuarios, JSON.stringify(usuarios, null, 2));
}

export function normalizarUsuario(usuario, indice, migrarLegados = false) {
  const { user, password, role, ...dados } = usuario;
  const papelInformado = usuario.papel ?? role;
  const papel = papeisValidos.includes(papelInformado)
    ? papelInformado
    : migrarLegados ? 'administrador' : 'usuario';

  return {
    ...dados,
    id: usuario.id ?? Date.now() + indice,
    nome: String(usuario.nome ?? user ?? `Usuário ${indice + 1}`).trim(),
    email: String(usuario.email ?? user ?? '').trim().toLowerCase(),
    senha: String(usuario.senha ?? password ?? ''),
    papel,
    podeGerenciarUsuarios: typeof usuario.podeGerenciarUsuarios === 'boolean'
      ? usuario.podeGerenciarUsuarios
      : migrarLegados,
    precisaAlterarSenha: usuario.precisaAlterarSenha === true,
    ativo: usuario.ativo !== false
  };
}

export function criarPerfilPublico(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    podeGerenciarUsuarios: usuario.podeGerenciarUsuarios,
    precisaAlterarSenha: usuario.precisaAlterarSenha
  };
}

export function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
