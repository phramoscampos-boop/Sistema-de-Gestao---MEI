// Obtém os elementos usados pelo formulário.
const formularioCadastro = document.getElementById('form-cadastro');
const nomeInput = document.getElementById('nome-cadastro');
const emailInput = document.getElementById('email-cadastro');
const senhaInput = document.getElementById('senha-cadastro');
const confirmacaoSenhaInput = document.getElementById('confirmacao-senha');
const mensagemErro = document.getElementById('mensagem-erro');
const mensagemSucesso = document.getElementById('mensagem-sucesso');

// Mostra uma mensagem de erro e esconde uma mensagem de sucesso anterior.
function mostrarErro(mensagem) {
    mensagemErro.textContent = mensagem;
    mensagemErro.classList.add('mostrar');
    mensagemSucesso.classList.remove('mostrar');
}

// Remove as mensagens exibidas antes de uma nova validação.
function limparMensagens() {
    mensagemErro.textContent = '';
    mensagemErro.classList.remove('mostrar');
    mensagemSucesso.textContent = '';
    mensagemSucesso.classList.remove('mostrar');
}

// Verifica se os dados digitados podem criar uma nova conta.
function validarCadastro() {
    if (nomeInput.value.trim() === '' || emailInput.value.trim() === '' ||
        senhaInput.value === '' || confirmacaoSenhaInput.value === '') {
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

// Exibe a confirmação do cadastro e limpa os campos do formulário.
function cadastrarUsuario() {
    if (!validarCadastro()) {
        return;
    }

    mensagemSucesso.textContent = 'Cadastro realizado com sucesso!';
    mensagemSucesso.classList.add('mostrar');
    mensagemErro.classList.remove('mostrar');
    formularioCadastro.reset();
}

// Impede o recarregamento da página e executa a validação ao enviar.
formularioCadastro.addEventListener('submit', function (evento) {
    evento.preventDefault();
    limparMensagens();
    cadastrarUsuario();
});