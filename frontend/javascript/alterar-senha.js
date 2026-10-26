const formulario = document.getElementById('form-alterar-senha');
const emailInput = document.getElementById('email-alterar');
const senhaAtualInput = document.getElementById('senha-atual');
const novaSenhaInput = document.getElementById('nova-senha');
const confirmarNovaSenhaInput = document.getElementById('confirmar-nova-senha');
const mensagemErro = document.getElementById('mensagem-erro');
const mensagemSucesso = document.getElementById('mensagem-sucesso');
let redirecionarPainelAposTroca = false;

fetch('/auth/session', { cache: 'no-store' })
  .then(async (resposta) => {
    if (!resposta.ok) return;
    const usuario = (await resposta.json()).usuario;
    emailInput.value = usuario.email;
    emailInput.readOnly = true;
    redirecionarPainelAposTroca = true;
  })
  .catch((erro) => console.error('Não foi possível verificar a sessão atual:', erro));

function limparMensagens() {
  mensagemErro.textContent = '';
  mensagemErro.classList.remove('mostrar');
  mensagemSucesso.textContent = '';
  mensagemSucesso.classList.remove('mostrar');
}

function mostrarErro(mensagem) {
  mensagemErro.textContent = mensagem;
  mensagemErro.classList.add('mostrar');
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limparMensagens();

  if (!emailInput.value.trim() || !emailInput.validity.valid ||
      !senhaAtualInput.value || !novaSenhaInput.value || !confirmarNovaSenhaInput.value) {
    mostrarErro('Preencha todos os campos com um e-mail válido.');
    return;
  }

  if (novaSenhaInput.value.length < 5) {
    mostrarErro('A nova senha deve ter pelo menos 5 caracteres.');
    return;
  }

  if (novaSenhaInput.value !== confirmarNovaSenhaInput.value) {
    mostrarErro('A confirmação da nova senha não corresponde.');
    return;
  }

  try {
    // O servidor confirma a senha atual e atualiza somente contas já existentes.
    const resposta = await fetch('/alterar-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailInput.value.trim().toLowerCase(),
        senhaAtual: senhaAtualInput.value,
        novaSenha: novaSenhaInput.value
      })
    });

    const dadosResposta = await resposta.json();
    if (!resposta.ok) {
      throw new Error(dadosResposta.mensagem || 'Não foi possível alterar a senha.');
    }

    formulario.reset();
    mensagemSucesso.textContent = dadosResposta.mensagem;
    mensagemSucesso.classList.add('mostrar');
    if (redirecionarPainelAposTroca && dadosResposta.irParaDashboard) {
      window.location.replace('/dashboard.html');
    }
  } catch (erro) {
    mostrarErro(erro.message || 'Não foi possível alterar a senha.');
  }
});
