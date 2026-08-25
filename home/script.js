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

