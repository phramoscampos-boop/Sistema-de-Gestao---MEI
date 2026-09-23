// === CADASTRAR SERVIÇO ===
function cadastrarServico(descricao, valor, clienteId, status = 'Pendente') {
  const usuarioId = getUsuarioId();
  if (!usuarioId) return;

  const servicos = JSON.parse(localStorage.getItem('servicos')) || [];

  const novoServico = {
    id: Date.now(),
    usuarioId: usuarioId,
    clienteId: parseInt(clienteId),
    descricao,
    valor: parseFloat(valor),
    status, // "Pendente" ou "Concluído"
    data: new Date().toLocaleDateString('pt-BR')
  };

  servicos.push(novoServico);
  localStorage.setItem('servicos', JSON.stringify(servicos));
  return novoServico;
}

// === LISTAR SERVIÇOS ===
function listarServicos() {
  const usuarioId = getUsuarioId();
  const servicos = JSON.parse(localStorage.getItem('servicos')) || [];
  
  return servicos.filter(s => s.usuarioId === usuarioId);
}