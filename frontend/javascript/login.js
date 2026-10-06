
// Seleciona os elementos do formulário de login.
const formLogin = document.getElementById('form-login');
const emailInput = document.getElementById('email-login');
const passwordInput = document.getElementById('password-login');
const mensagemErro = document.getElementById('mensagem-erro');
const apiUrl = 'http://localhost:3000';

function mostrarErro(mensagem) {
  mensagemErro.textContent = mensagem;
  mensagemErro.classList.add('mostrar');
}

function limparErro() {
  mensagemErro.textContent = '';
  mensagemErro.classList.remove('mostrar');
}

function validarFormulario() {
  limparErro();

  if (!emailInput.value.trim() || !passwordInput.value.trim()) {
    mostrarErro('Por favor, preencha todos os campos.');
    return false;
  }

  if (!emailInput.validity.valid) {
    mostrarErro('Por favor, informe um e-mail válido.');
    return false;
  }

  return true;
}

function limparFormulario() {
  emailInput.value = '';
  passwordInput.value = '';
}

async function fazerLogin() {
  if (!validarFormulario()) {
    return;
  }

  try {
    const resposta = await fetch(`${apiUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: emailInput.value.trim().toLowerCase(),
        senha: passwordInput.value
      })
    });

    const dadosResposta = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dadosResposta.mensagem || 'E-mail ou senha incorretos.');
    }

    localStorage.setItem('usuarioLogado', JSON.stringify(dadosResposta.usuario));
    limparFormulario();
    window.location.href = 'dashboard.html';
  } catch (erro) {
    mostrarErro(erro.message || 'Não foi possível fazer login.');
  }
}

const usuarioLogado = localStorage.getItem('usuarioLogado');
if (usuarioLogado) {
  window.location.href = 'dashboard.html';
}

formLogin.addEventListener('submit', function (event) {
  event.preventDefault();
  fazerLogin();
});

