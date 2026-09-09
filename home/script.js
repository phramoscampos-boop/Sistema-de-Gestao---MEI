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
    if (!validarFormulario()) {
        return;
    }

    const email = document.getElementById('email-login').value;
    const senha = document.getElementById('password-login').value;
    const emailCorreto = 'elislabelle@email.com';
    const senhaCorreta = '123456';

    if (email === emailCorreto && senha === senhaCorreta) {
        alert('Login bem-sucedido!');
        window.location.href = 'dashboard.html';
    } else {
        alert('E-mail ou senha incorretos. Tente novamente.');
    }
}

document.getElementById('form-login').addEventListener('submit', function (event) {
    event.preventDefault();
    login();
});
