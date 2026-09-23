// Obter usuário logado atual
function getUsuarioId() {
  const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
  return usuario ? usuario.id : null;
}

// === CADASTRAR CLIENTE ===
function cadastrarCliente(nome, telefone, email) {
  const usuarioId = getUsuarioId();
  if (!usuarioId) return;

  const clientes = JSON.parse(localStorage.getItem('clientes')) || [];

  const novoCliente = {
    id: Date.now(),
    usuarioId: usuarioId, // Vincula o cliente ao MEI logado
    nome,
    telefone,
    email
  };

  clientes.push(novoCliente);
  localStorage.setItem('clientes', JSON.stringify(clientes));
  return novoCliente;
}

// === LISTAR CLIENTES DO USUÁRIO LOGADO ===
function listarClientes() {
  const usuarioId = getUsuarioId();
  const clientes = JSON.parse(localStorage.getItem('clientes')) || [];
  
  // Retorna apenas os clientes cadastrados pelo usuário atual
  return clientes.filter(c => c.usuarioId === usuarioId);
}

// === EXCLUIR CLIENTE ===
function excluirCliente(clienteId) {
  let clientes = JSON.parse(localStorage.getItem('clientes')) || [];
  clientes = clientes.filter(c => c.id !== clienteId);
  localStorage.setItem('clientes', JSON.stringify(clientes));
}