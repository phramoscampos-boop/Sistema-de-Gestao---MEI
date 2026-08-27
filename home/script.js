// função para manipular o modal
function controlarModal() {
    const modal = document.getElementById('modal');
    const abrirModal = document.getElementById('abrirModal');
    const fecharModal = document.getElementById('fecharModal');
    const container = document.querySelector('.container');

    abrirModal.onclick = function() {
        modal.style.display = 'flex';
        container.style.filter = 'blur(5px)';
    };

    fecharModal.onclick = function() {
        modal.style.display = 'none';
        container.style.filter = 'none';
    };
}
controlarModal();

function validarFormulario() {
    const emailInput = document.getElementById('email-login');
    const passwordInput = document.getElementById('password-login');

    if (emailInput.value === '' || passwordInput.value === '') {
        alert('Por favor, preencha todos os campos.');
        return false;
    }

    return true;
}

function login() {
    if (validarFormulario()) {
        const email = document.getElementById('email-login').value;
        const password = document.getElementById('password-login').value;
        const emailCorreto = "elislabelle@email.com";
        const senhaCorreta = "123456";

        if (email === emailCorreto && password === senhaCorreta) {
            alert('Login bem-sucedido!');
            window.location.href = 'dashboard.html';
        } else {
            alert('Email ou senha incorretos. Tente novamente.');
        }
    }
}