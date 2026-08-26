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

