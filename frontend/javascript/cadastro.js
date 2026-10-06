// Seleciona os campos do formulário de cadastro.
const formularioCadastro = document.getElementById('form-cadastro');
const nomeInput = document.getElementById('nome-cadastro');
const emailInput = document.getElementById('email-cadastro');
const senhaInput = document.getElementById('senha-cadastro');
const confirmacaoSenhaInput = document.getElementById('confirmacao-senha');
const mensagemErro = document.getElementById('mensagem-erro');
const mensagemSucesso = document.getElementById('mensagem-sucesso');
const apiUrl = 'http://localhost:3000';

function mostrarErro(mensagem) {
  mensagemErro.textContent = mensagem;
  mensagemErro.classList.add('mostrar');
  mensagemSucesso.textContent = '';
  mensagemSucesso.classList.remove('mostrar');
}

function limparMensagens() {
  mensagemErro.textContent = '';
  mensagemErro.classList.remove('mostrar');
  mensagemSucesso.textContent = '';
  mensagemSucesso.classList.remove('mostrar');
}

function validarCadastro() {
  if (!nomeInput.value.trim() || !emailInput.value.trim() || !senhaInput.value || !confirmacaoSenhaInput.value) {
    mostrarErro('Por favor, preencha todos os campos.');
    return false;
  }

  if (!emailInput.validity.valid) {
    mostrarErro('Por favor, informe um e-mail válido.');
    return false;
  }

  if (senhaInput.value.length < 6) {
    mostrarErro('A senha deve ter pelo menos 6 caracteres.');
    return false;
  }

  if (senhaInput.value !== confirmacaoSenhaInput.value) {
    mostrarErro('As senhas precisam ser iguais.');
    return false;
  }

  return true;
}

async function cadastrarUsuarioNoServidor() {
  if (!validarCadastro()) {
    return;
  }

  const dadosCadastro = {
    nome: nomeInput.value.trim(),
    email: emailInput.value.trim().toLowerCase(),
    senha: senhaInput.value
  };

  try {
    const resposta = await fetch(`${apiUrl}/usuarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dadosCadastro)
    });

    const dadosResposta = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dadosResposta.mensagem || 'Não foi possível cadastrar o usuário.');
    }

    limparMensagens();
    mensagemSucesso.textContent = 'Cadastro realizado com sucesso! Redirecionando para o login...';
    mensagemSucesso.classList.add('mostrar');

    formularioCadastro.reset();

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
  } catch (erro) {
    mostrarErro(erro.message || 'Erro ao cadastrar usuário.');
  }
}

formularioCadastro.addEventListener('submit', function (evento) {
  evento.preventDefault();
  limparMensagens();
  cadastrarUsuarioNoServidor();
});