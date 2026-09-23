// função para abrir perfil

function mostrarPerfil() {

    const perfil = document.getElementById('profile');
    const setaPerfil = document.querySelector('.profile_arrow_img');
    const modalPerfil = document.getElementById('modalProfile');

    perfil.addEventListener('click', function() {

        if (modalPerfil.classList.contains('aberto')) { // Verifica se o modal já está aberto
            modalPerfil.classList.remove('aberto'); // Fecha o modal
            setaPerfil.classList.remove('aberta'); // Remove a classe que indica que a seta está aberta
        } else {
            modalPerfil.classList.add('aberto'); 
            setaPerfil.classList.add('aberta');
        }
    });
}

mostrarPerfil();

// função para chamar página de cadastro

function cadastro_cliente_page(){
    const abrir_CadastroCliente = document.getElementById('abrir_CadastroCliente');
    const cadastro_cliente = document.getElementById('cadastro_cliente');
    const closeCadCli = document.getElementById('closeCadCli');
    const home_page = document.querySelector('.home_page');

    abrir_CadastroCliente.onclick = function(){
        cadastro_cliente.style.display = 'flex';
        home_page.classList.add('home_blur');

        ScrollReveal().clean('.cadastro-content'); // Limpa qualquer animação anterior
        ScrollReveal().reveal('.cadastro-content', { 
            duration: 600, 
            origin: 'bottom', 
            distance: '30px', 
            easing: 'ease-in-out', 
            opacity: 0, 
            scale: 0.9});           
    }
   
    closeCadCli.onclick = function() {
        cadastro_cliente.style.display = 'none';
        home_page.classList.remove('home_blur');
    };
};
cadastro_cliente_page();

// FORMATAR TELEFONE

// Encontra o campo de telefone pelo ID
const telefone = document.getElementById('telefone-cad-cliente');
// Executa sempre que algo for digitado no campo
telefone.addEventListener('input', function() {

    // Remove tudo que não for número
    let valor = telefone.value.replace(/\D/g, '');

    // Limita o telefone a 11 números
    if (valor.length > 11) {
        valor = valor.slice(0, 11);
    }

    // Formata: (xx) xxxxx-xxxx
    if (valor.length > 6) {
        valor = valor.replace(
            /^(\d{2})(\d{5})(\d{0,4}).*/,
            '($1) $2-$3'
        );
    } 
    
    // Formata: (xx) xxxxx
    else if (valor.length > 2) {
        valor = valor.replace(
            /^(\d{2})(\d{0,5})/,
            '($1) $2'
        );
    } 
    
    // Adiciona apenas o início do formato: (xx
    else if (valor.length > 0) {
        valor = valor.replace(
            /^(\d{0,2})/,
            '($1'
        );
    }

    // Atualiza o campo com o telefone formatado
    telefone.value = valor;
});

// FORMATAR DATA DE NASCIMENTO

// Encontra o campo de data pelo ID
const nasc = document.getElementById('nasc-cad-cliente');
// Executa sempre que algo for digitado no campo
nasc.addEventListener('input', function() {

    // Remove tudo que não for número
    let valor = nasc.value.replace(/\D/g, '');

    // Limita a data a 8 números
    if (valor.length > 8) {
        valor = valor.slice(0, 8);
    }

    // Formata: xx/xx/xxxx
    if (valor.length > 4) {
        valor = valor.replace(
            /^(\d{2})(\d{2})(\d{0,4}).*/,
            '$1/$2/$3'
        );
    } 
    
    // Formata: xx/xx/xxxx
    else if (valor.length > 2) {
        valor = valor.replace(
            /^(\d{2})(\d{0,2})/,
            '$1/$2'
        );
    } 
    
    // Adiciona apenas o início do formato: xx/
    else if (valor.length > 0) {
        valor = valor.replace(
            /^(\d{0,2})/,
            '$1'
        );
    }

    // Atualiza o campo com a data formatado
    nasc.value = valor;
});

// FORMATAR CEP

// Encontra o campo de CEP pelo ID
const cep = document.getElementById('cep-cad-cliente');
// Executa sempre que algo for digitado no campo
cep.addEventListener('input', function() {

    // Remove tudo que não for número
    let valor = cep.value.replace(/\D/g, '');

    // Limita o CEP a 8 números
    if (valor.length > 8) {
        valor = valor.slice(0, 8);
    }

    // Formata: xxxxx-xxx
    if (valor.length > 5) {
        valor = valor.replace(
            /^(\d{5})(\d{0,3}).*/,
            '$1-$2'
        );
    } 
    
    // Adiciona apenas o início do formato: xxxxx
    else if (valor.length > 0) {
        valor = valor.replace(
            /^(\d{0,5})/,
            '$1'
        );
    }

    // Atualiza o campo com o CEP formatado
    cep.value = valor;
});

// controlar botão


// voltar para home

function voltarHome() {
    const voltarHomeBtn = document.getElementById('voltarHome');
    voltarHomeBtn.addEventListener("click", function(){
        // Redireciona para a página inicial, que está na mesma pasta do dashboard.
        window.location.href = 'login.html';
    });
}

// Ativa o evento de clique assim que o script é carregado.
voltarHome();

