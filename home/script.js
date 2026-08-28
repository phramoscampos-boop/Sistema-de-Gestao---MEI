// função para manipular o modal
function controlarModal() {
    const modal = document.getElementById('modal');
    const abrirModal = document.getElementById('abrirModal');
    const fecharModal = document.getElementById('fecharModal');
    const container = document.querySelector('.container');

    abrirModal.onclick = function() {
        modal.style.display = 'flex';
        container.style.filter = 'blur(5px)';

        ScrollReveal().clean('.modal-conteudo'); // Limpa qualquer animação anterior
        ScrollReveal().reveal('.modal-conteudo', { duration: 600, origin: 'bottom', distance: '30px', easing: 'ease-in-out', opacity: 0, scale: 0.9});
    };

    fecharModal.onclick = function() {
        modal.style.display = 'none';
        container.style.filter = 'none';
    };
}
controlarModal();

// função para validar o formulário
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

    // credenciais

    const emailCorreto = 'elislabelle@email.com';
    const senhaCorreta = '123456';

    // verificação de credenciais

    if (email === emailCorreto && senha === senhaCorreta) {

        alert('Login bem-sucedido!');

        window.location.href = 'dashboard.html';
    } else {

        alert("E-mail ou senha incorretos. Tente novamente.")
    }
}

// evento que executa a função login quando a tecla 'Enter' for pressionada
document.addEventListener('keydown', function(event) {
    
    if (event.key === 'Enter') {
        login();
    }
})