
// ELEMENTOS DO FORMULÁRIO

const formLogin = document.getElementById('form-login');
const emailInput = document.getElementById('email-login');
const passwordInput = document.getElementById('password-login');


// CREDENCIAIS

const emailCorreto = 'elislabelle@email.com';
const senhaCorreta = '123456';


// VALIDAÇÃO

function validarFormulario() {

    limparErro();

    if (emailInput.value === '' || passwordInput.value === '') {

        mostrarErro('Por favor, preencha todos os campos.');

        return false;
    }

    // Alterado: valida o formato do e-mail pelo JavaScript após desativar a validação nativa do formulário.
    if (!emailInput.validity.valid) {

        mostrarErro('Por favor, informe um e-mail válido.');

        return false;
    }

    return true;
}


// LOGIN

function login() {

    if (!validarFormulario()) {
        return;
    }

    const email = emailInput.value;
    const senha = passwordInput.value;

    if (email === emailCorreto && senha === senhaCorreta) {

        // Alterado: o login correto segue direto para o painel, sem usar alert.
        window.location.href = 'dashboard.html';

    } else {

        // Alterado: exibe a mensagem criada na página em vez de um alert.
        mostrarErro('E-mail ou senha incorretos. Tente novamente.');

        return;
    }

    limparFormulario();
}


// LIMPAR FORMULÁRIO

function limparFormulario() {

    emailInput.value = '';
    passwordInput.value = '';
}


// EVENTO DO FORMULÁRIO

formLogin.addEventListener('submit', function (event) {

    event.preventDefault();

    login();

});

// MENSAGEM DE ERRO

const mensagemErro = document.getElementById('mensagem-erro');

function mostrarErro(mensagem) {
    mensagemErro.textContent = mensagem;
    mensagemErro.classList.add('mostrar');
}

function limparErro(){
    // Alterado: limpa o texto do elemento sem tentar reatribuir a constante mensagemErro.
    mensagemErro.textContent = '';
    mensagemErro.classList.remove('mostrar');
}

