// função para abrir perfil
const bt_profile = document.getElementById('bt_profile');

function mostrarPerfil() {
    const bt_profile = document.getElementById('bt_profile')
    const profile_info = document.getElementById('profile_info')
    
    bt_profile.onclick = function() {
        
        profile_info.style.display = 'flex';
    };
}
mostrarPerfil();

//função para chamar página de cadastro

function cadastro_cliente_page(){
    const abrir_CadastroCliente = document.getElementById('abrir_CadastroCliente');
    const cadastro_cliente = document.getElementById('cadastro_cliente');
    const closeCadCli = document.getElementById('closeCadCli');
    const home_page = document.querySelector('.home_page');

    abrir_CadastroCliente.onclick = function(){
        cadastro_cliente.style.display = 'flex';
        home_page.style.filter = 'blur(5px)';

        ScrollReveal().clean('.cadastro-content'); // Limpa qualquer animação anterior
        ScrollReveal().reveal('.cadastro-content', { duration: 600, origin: 'bottom', distance: '30px', easing: 'ease-in-out', opacity: 0, scale: 0.9});
    }

    /*abrir_CadastroCliente.onclick = function(){
    cadastro_cliente.style.display = 'flex';
    cadastro_cliente.style.position = 'fixed';
    cadastro_cliente.style.zIndex = '9999';
    cadastro_cliente.style.top = '0';
    cadastro_cliente.style.left = '0';*/
    
    home_page.style.filter = 'blur(5px)';

    closeCadCli.onclick = function() {
        cadastro_cliente.style.display = 'none';
        home_page.style.filter = 'none';
    };
};
cadastro_cliente_page();


