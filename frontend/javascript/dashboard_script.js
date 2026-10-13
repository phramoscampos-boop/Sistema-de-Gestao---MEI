const apiUrl = 'http://localhost:3000';
const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');

if (!usuarioLogado) {
  window.location.href = 'login.html';
}

function formatarValor(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

const nomeUsuarioDashboard = document.getElementById('nome-usuario-dashboard');
const emailUsuarioDashboard = document.getElementById('email-usuario-dashboard');

if (nomeUsuarioDashboard && usuarioLogado) {
  nomeUsuarioDashboard.textContent = usuarioLogado.nome || 'Usuário';
}

if (emailUsuarioDashboard && usuarioLogado) {
  emailUsuarioDashboard.textContent = usuarioLogado.email || 'E-mail não informado';
}

const botaoSair = document.getElementById('botao-sair');
botaoSair.addEventListener('click', () => {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../html/login.html';
});

const modalPerfil = document.getElementById('modalProfile');
const setaPerfil = document.querySelector('.profile_arrow_img');
document.getElementById('profile').addEventListener('click', () => {
  modalPerfil.classList.toggle('aberto');
  setaPerfil.classList.toggle('aberta');
});

const homePage = document.querySelector('.home_page');
const modais = [
  document.getElementById('cadastro_cliente'),
  document.getElementById('cadastro_servico')
];

function fecharModais() {
  modais.forEach((modal) => {
    modal.classList.remove('aberto');
    modal.setAttribute('aria-hidden', 'true');
  });
  homePage.classList.remove('home_blur');
}

function abrirModal(modal) {
  fecharModais();
  modal.classList.add('aberto');
  modal.setAttribute('aria-hidden', 'false');
  homePage.classList.add('home_blur');
  modal.querySelector('form input, form select, form button')?.focus();
}

document.getElementById('abrir_CadastroCliente').addEventListener('click', async () => {
  limparMensagem(mensagemErroCliente);
  abrirModal(document.getElementById('cadastro_cliente'));
  await carregarServicos();
});
document.getElementById('abrir_CadastroServico').addEventListener('click', async () => {
  limparMensagem(mensagemErroServico);
  abrirModal(document.getElementById('cadastro_servico'));
  await carregarServicos();
});
document.getElementById('closeCadCli').addEventListener('click', fecharModais);
document.getElementById('closeCadServico').addEventListener('click', fecharModais);
modais.forEach((modal) => {
  modal.addEventListener('click', (evento) => {
    if (evento.target === modal) fecharModais();
  });
});
document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape') fecharModais();
});

function mostrarMensagem(elemento, texto) {
  elemento.textContent = texto;
  elemento.classList.add('mostrar');
}

function limparMensagem(elemento) {
  elemento.textContent = '';
  elemento.classList.remove('mostrar');
}

async function requisitarJson(url, opcoes = {}) {
  const resposta = await fetch(`${apiUrl}${url}`, opcoes);
  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(dados.mensagem || 'Não foi possível concluir a operação.');
  }
  return dados;
}

function adicionarTexto(elemento, etiqueta, valor) {
  const paragrafo = document.createElement('p');
  const rotulo = document.createElement('strong');
  rotulo.textContent = `${etiqueta}: `;
  paragrafo.append(rotulo, document.createTextNode(valor));
  elemento.append(paragrafo);
}

function formatarData(data) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarTelefone(telefone) {
  const numeros = telefone.replace(/\D/g, '');
  const codigoArea = numeros.slice(0, 2);
  const tamanhoNumero = numeros.length === 11 ? 5 : 4;
  return `(${codigoArea}) ${numeros.slice(2, 2 + tamanhoNumero)}-${numeros.slice(2 + tamanhoNumero)}`;
}

function formatarCep(cep) {
  const numeros = cep.replace(/\D/g, '');
  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
}

async function carregarClientes() {
  const lista = document.getElementById('lista-clientes');
  lista.replaceChildren();

  try {
    const clientes = await requisitarJson('/clientes');
    if (clientes.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'mensagem-lista';
      vazio.textContent = 'Ainda não há clientes cadastrados.';
      lista.append(vazio);
      return;
    }

    clientes.slice().reverse().forEach((cliente) => {
      const card = document.createElement('article');
      card.className = 'cliente-card';
      const nome = document.createElement('h3');
      nome.textContent = cliente.nome;
      card.append(nome);
      adicionarTexto(card, 'Telefone', formatarTelefone(cliente.telefone));
      adicionarTexto(card, 'Nascimento', formatarData(cliente.dataNascimento));
      adicionarTexto(card, 'CEP', formatarCep(cliente.cep));
      adicionarTexto(card, 'Serviço', cliente.servicoNome);
      if (Number.isFinite(cliente.servicoValor)) {
        adicionarTexto(card, 'Valor do serviço', formatarValor(cliente.servicoValor));
      }
      lista.append(card);
    });
  } catch (erro) {
    const mensagem = document.createElement('p');
    mensagem.className = 'mensagem-lista';
    mensagem.textContent = erro.message || 'Não foi possível carregar os clientes.';
    lista.append(mensagem);
  }
}

async function carregarServicos() {
  const seletor = document.getElementById('servico-cad-cliente');
  const lista = document.getElementById('lista-servicos');
  seletor.replaceChildren();
  lista.replaceChildren();

  try {
    const servicos = await requisitarJson('/servicos');
    const disponiveis = servicos.filter(
      (servico) => servico.ofertado && Number.isFinite(servico.valor) && servico.valor > 0
    );
    const opcaoInicial = document.createElement('option');
    opcaoInicial.value = '';
    opcaoInicial.textContent = disponiveis.length
      ? 'Selecione um serviço'
      : 'Nenhum serviço ofertado';
    seletor.append(opcaoInicial);
    seletor.disabled = disponiveis.length === 0;

    disponiveis.forEach((servico) => {
      const opcao = document.createElement('option');
      opcao.value = servico.id;
      const valor = Number.isFinite(servico.valor)
        ? formatarValor(servico.valor)
        : 'valor não informado';
      opcao.textContent = `${servico.nome} (${formatarDuracao(servico.duracaoMinutos)} - ${valor})`;
      seletor.append(opcao);
    });

    if (servicos.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'mensagem-lista';
      vazio.textContent = 'Nenhum serviço cadastrado.';
      lista.append(vazio);
    } else {
      servicos.forEach((servico) => {
        const item = document.createElement('article');
        item.className = 'servico-item';
        const informacoes = document.createElement('div');
        const nome = document.createElement('strong');
        nome.textContent = servico.nome;
        const duracao = document.createElement('p');
        duracao.textContent = formatarDuracao(servico.duracaoMinutos);
        const valor = document.createElement('p');
        valor.textContent = Number.isFinite(servico.valor)
          ? formatarValor(servico.valor)
          : 'Valor não informado';
        informacoes.append(nome, duracao, valor);

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'botao-oferta';
        botao.textContent = servico.ofertado ? 'Ofertado' : 'Não ofertado';
        botao.setAttribute('aria-pressed', String(servico.ofertado));
        botao.addEventListener('click', () => alterarOferta(servico.id, !servico.ofertado));
        item.append(informacoes, botao);
        lista.append(item);
      });
    }
  } catch (erro) {
    seletor.disabled = true;
    const opcaoErro = document.createElement('option');
    opcaoErro.textContent = erro.message || 'Não foi possível carregar os serviços.';
    seletor.append(opcaoErro);
    const mensagem = document.createElement('p');
    mensagem.className = 'mensagem-lista';
    mensagem.textContent = erro.message || 'Não foi possível carregar os serviços.';
    lista.append(mensagem);
  }
}

function formatarDuracao(minutos) {
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  if (horas && minutosRestantes) return `${horas}h ${minutosRestantes}min`;
  if (horas) return `${horas}h`;
  return `${minutosRestantes} min`;
}

async function alterarOferta(id, ofertado) {
  try {
    await requisitarJson(`/servicos/${encodeURIComponent(id)}/oferta`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ofertado })
    });
    await carregarServicos();
  } catch (erro) {
    window.alert(erro.message || 'Não foi possível atualizar a oferta do serviço.');
  }
}

const telefoneInput = document.getElementById('telefone-cad-cliente');
telefoneInput.addEventListener('input', () => {
  const numeros = telefoneInput.value.replace(/\D/g, '').slice(0, 11);
  if (numeros.length > 6 && numeros.length <= 10) {
    telefoneInput.value = numeros.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (numeros.length > 10) {
    telefoneInput.value = numeros.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
  } else if (numeros.length > 2) {
    telefoneInput.value = numeros.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  } else if (numeros.length) {
    telefoneInput.value = `(${numeros}`;
  } else {
    telefoneInput.value = '';
  }
});

const cepInput = document.getElementById('cep-cad-cliente');
cepInput.addEventListener('input', () => {
  const numeros = cepInput.value.replace(/\D/g, '').slice(0, 8);
  cepInput.value = numeros.length > 5
    ? `${numeros.slice(0, 5)}-${numeros.slice(5)}`
    : numeros;
});

const formCliente = document.getElementById('form-cadastro-cliente');
const mensagemErroCliente = document.getElementById('mensagem-erro-cliente');
formCliente.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limparMensagem(mensagemErroCliente);

  const dadosCliente = {
    nome: document.getElementById('nome-cad-cliente').value.trim(),
    telefone: telefoneInput.value,
    dataNascimento: document.getElementById('nasc-cad-cliente').value,
    cep: cepInput.value,
    servicoId: document.getElementById('servico-cad-cliente').value
  };

  try {
    await requisitarJson('/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosCliente)
    });
    formCliente.reset();
    fecharModais();
    await carregarClientes();
  } catch (erro) {
    mostrarMensagem(mensagemErroCliente, erro.message || 'Não foi possível cadastrar o cliente.');
  }
});

const formServico = document.getElementById('form-cadastro-servico');
const mensagemErroServico = document.getElementById('mensagem-erro-servico');
formServico.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limparMensagem(mensagemErroServico);

  const dadosServico = {
    nome: document.getElementById('nome-servico').value.trim(),
    duracaoMinutos: Number(document.getElementById('duracao-servico').value),
    valor: Number(document.getElementById('valor-servico').value)
  };

  try {
    await requisitarJson('/servicos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosServico)
    });
    formServico.reset();
    await carregarServicos();
  } catch (erro) {
    mostrarMensagem(mensagemErroServico, erro.message || 'Não foi possível cadastrar o serviço.');
  }
});

document.getElementById('voltarHome').addEventListener('click', () => {
  window.location.href = '../html/login.html';
});

carregarClientes();
