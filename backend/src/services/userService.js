import pool from '../config/database.js';

const colunasUsuario = `
  id, nome, email, senha, cargo,
  precisa_alterar_senha AS "precisaAlterarSenha",
  pode_gerenciar_usuarios AS "podeGerenciarUsuarios"
`;

export function formatarUsuario(dbUser) {
  if (!dbUser) return null;

  const cargo = dbUser.cargo ?? dbUser.papel ?? 'usuario';
  return {
    id: dbUser.id,
    nome: dbUser.nome,
    email: dbUser.email,
    cargo,
    papel: cargo,
    precisaAlterarSenha: dbUser.precisaAlterarSenha ?? dbUser.precisa_alterar_senha ?? false,
    podeGerenciarUsuarios:
      dbUser.podeGerenciarUsuarios ?? dbUser.pode_gerenciar_usuarios ?? false
  };
}

function formatarUsuarioComSenha(dbUser) {
  const usuario = formatarUsuario(dbUser);
  return usuario ? { ...usuario, senha: dbUser.senha } : null;
}

export function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function criarPerfilPublico(usuario) {
  return formatarUsuario(usuario);
}

export async function buscarPorEmail(email) {
  const resultado = await pool.query(
    `SELECT ${colunasUsuario}
     FROM usuarios
     WHERE email = $1`,
    [email]
  );
  return formatarUsuarioComSenha(resultado.rows[0]);
}

export async function buscarPorLogin(login) {
  const resultado = await pool.query(
    `SELECT ${colunasUsuario}
     FROM usuarios
     WHERE email = $1 OR lower(nome) = $1
     ORDER BY CASE WHEN email = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [login]
  );
  return formatarUsuarioComSenha(resultado.rows[0]);
}

export async function buscarPorId(id) {
  const resultado = await pool.query(
    `SELECT ${colunasUsuario}
     FROM usuarios
     WHERE id = $1`,
    [id]
  );
  return formatarUsuarioComSenha(resultado.rows[0]);
}

export async function listarUsuarios() {
  const resultado = await pool.query(
    `SELECT id, nome, email, cargo,
            precisa_alterar_senha AS "precisaAlterarSenha",
            pode_gerenciar_usuarios AS "podeGerenciarUsuarios"
     FROM usuarios
     ORDER BY id`
  );
  return resultado.rows.map(formatarUsuario);
}

export async function criarUsuario({
  nome,
  email,
  senha,
  cargo = 'usuario',
  precisaAlterarSenha = true,
  podeGerenciarUsuarios = false
}) {
  try {
    const resultado = await pool.query(
      `INSERT INTO usuarios
         (nome, email, senha, cargo, precisa_alterar_senha, pode_gerenciar_usuarios)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, email, cargo,
                 precisa_alterar_senha AS "precisaAlterarSenha",
                 pode_gerenciar_usuarios AS "podeGerenciarUsuarios"`,
      [nome, email, senha, cargo, precisaAlterarSenha, podeGerenciarUsuarios]
    );
    return formatarUsuario(resultado.rows[0]);
  } catch (erro) {
    if (erro.code === '23505') {
      const erroEmailDuplicado = new Error('E-mail já cadastrado');
      erroEmailDuplicado.code = 'EMAIL_DUPLICADO';
      throw erroEmailDuplicado;
    }
    throw erro;
  }
}

export async function atualizarSenha(id, senha, precisaAlterarSenha = false) {
  const resultado = await pool.query(
    `UPDATE usuarios
     SET senha = $1, precisa_alterar_senha = $2
     WHERE id = $3
     RETURNING id, nome, email, cargo,
               precisa_alterar_senha AS "precisaAlterarSenha",
               pode_gerenciar_usuarios AS "podeGerenciarUsuarios"`,
    [senha, precisaAlterarSenha, id]
  );
  return formatarUsuario(resultado.rows[0]);
}

export async function atualizarEmail(id, email) {
  try {
    const resultado = await pool.query(
      `UPDATE usuarios
       SET email = $1
       WHERE id = $2
       RETURNING id, nome, email, cargo,
                 precisa_alterar_senha AS "precisaAlterarSenha",
                 pode_gerenciar_usuarios AS "podeGerenciarUsuarios"`,
      [email, id]
    );
    return formatarUsuario(resultado.rows[0]);
  } catch (erro) {
    if (erro.code === '23505') {
      const erroEmailDuplicado = new Error('E-mail já cadastrado');
      erroEmailDuplicado.code = 'EMAIL_DUPLICADO';
      throw erroEmailDuplicado;
    }
    throw erro;
  }
}

export async function atualizarCargo(id, cargo) {
  const resultado = await pool.query(
    `UPDATE usuarios
     SET cargo = $1
     WHERE id = $2 AND pode_gerenciar_usuarios = FALSE
     RETURNING id, nome, email, cargo,
               precisa_alterar_senha AS "precisaAlterarSenha",
               pode_gerenciar_usuarios AS "podeGerenciarUsuarios"`,
    [cargo, id]
  );
  return formatarUsuario(resultado.rows[0]);
}

export async function excluirUsuario(id) {
  const resultado = await pool.query(
    `DELETE FROM usuarios
     WHERE id = $1 AND pode_gerenciar_usuarios = FALSE
     RETURNING id`,
    [id]
  );
  return resultado.rows.length > 0;
}

export async function existeProprietaria() {
  const resultado = await pool.query(
    `SELECT 1
     FROM usuarios
     WHERE cargo = 'proprietaria'
     LIMIT 1`
  );
  return resultado.rows.length > 0;
}
