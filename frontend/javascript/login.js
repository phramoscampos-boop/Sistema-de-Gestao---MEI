
// Seleciona os elementos do formulário de login.
const formLogin = document.getElementById('form-login');
const emailInput = document.getElementById('email-login');
const passwordInput = document.getElementById('password-login');
const mensagemErro = document.getElementById('mensagem-erro');

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
    const resposta = await fetch('/login', {
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

    limparFormulario();
    window.location.replace(dadosResposta.usuario?.precisaAlterarSenha
      ? '/html/alterar-senha.html'
      : '/dashboard.html');
  } catch (erro) {
    mostrarErro(erro.message || 'Não foi possível fazer login.');
  }
}

formLogin.addEventListener('submit', function (event) {
  event.preventDefault();
  fazerLogin();
});

// Redireciona somente quando o servidor confirma que o cookie ainda representa uma sessão válida.
fetch('/auth/session', { cache: 'no-store' })
  .then(async (resposta) => {
    if (resposta.status === 204) return;
    if (resposta.ok) {
      window.location.replace('/dashboard.html');
      return;
    }
    if (resposta.status !== 401) {
      const dados = await resposta.json();
      throw new Error(dados.mensagem || 'Não foi possível verificar a sessão.');
    }
  })
  .catch((erro) => {
    console.error('Não foi possível verificar a sessão atual:', erro);
    mostrarErro('Não foi possível verificar sua sessão. Tente novamente.');
  });
