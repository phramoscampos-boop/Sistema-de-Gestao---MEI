// === REGISTRO DE USUÁRIO NO STORAGE ===
function salvarUsuarioNoStorage(nome, email, senha) {
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];

    // Verificar se o e-mail já está cadastrado
    const usuarioExiste = usuarios.some(u => u.email === email);
    if (usuarioExiste) {
        return { sucesso: false, mensagem: 'Este e-mail já está cadastrado!' };
    }

    // Adicionar novo usuário
    const novoUsuario = { id: Date.now(), nome, email, senha };
    usuarios.push(novoUsuario);
    localStorage.setItem('usuarios', JSON.stringify(usuarios));

    return { sucesso: true, mensagem: 'Usuário cadastrado com sucesso!' };
}

// === LOGIN DE USUÁRIO ===
function fazerLogin(email, senha) {
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const usuario = usuarios.find(u => u.email === email && u.senha === senha);

    if (usuario) {
        const sessao = { id: usuario.id, nome: usuario.nome, email: usuario.email };
        localStorage.setItem('usuarioLogado', JSON.stringify(sessao));
        return true;
    }
    return false;
}

// === CONTROLE DE ACESSO (Dashboard e páginas protegidas) ===
function verificarSessao() {
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    if (!usuarioLogado) {
        window.location.href = 'login.html';
    }
}

// === LOGOUT ===
function fazerLogout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'login.html';
}