// Consulta o servidor para validar a sessão HttpOnly, sem ler credenciais no navegador.
async function verificarSessao() {
  const resposta = await fetch('/auth/session', { cache: 'no-store' });
  if (!resposta.ok) return null;
  return (await resposta.json()).usuario;
}

// Encerra no servidor a sessão vinculada ao cookie e substitui a página no histórico.
async function fazerLogout() {
  const resposta = await fetch('/logout', { method: 'POST', cache: 'no-store' });
  if (!resposta.ok) throw new Error('Não foi possível encerrar a sessão.');
  window.location.replace('/');
}