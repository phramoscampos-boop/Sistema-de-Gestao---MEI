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
let clientesCarregados = [];
let servicosCarregados = [];
let atendimentosCarregados = [];
const modais = [
  document.getElementById('cadastro_cliente'),
  document.getElementById('cadastro_servico'),
  document.getElementById('cadastro_atendimento')
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
  prepararFormularioCliente();
  limparMensagem(mensagemErroCliente);
  abrirModal(document.getElementById('cadastro_cliente'));
  await carregarServicos();
});
document.getElementById('abrir_CadastroServico').addEventListener('click', async () => {
  prepararFormularioServico();
  limparMensagem(mensagemErroServico);
  abrirModal(document.getElementById('cadastro_servico'));
});
document.getElementById('abrir_CadastroAtendimento').addEventListener('click', async () => {
  prepararFormularioAtendimento();
  limparMensagem(mensagemErroAtendimento);
  abrirModal(document.getElementById('cadastro_atendimento'));
  await Promise.all([carregarClientes(), carregarServicos()]);
  atualizarSelecaoClienteAtendimento();
  preencherServicosAtendimento();
});
document.getElementById('closeCadCli').addEventListener('click', fecharModais);
document.getElementById('closeCadServico').addEventListener('click', fecharModais);
document.getElementById('closeCadAtendimento').addEventListener('click', fecharModais);
modais.forEach((modal) => {
  modal.addEventListener('click', (evento) => {
    if (evento.target === modal) fecharModais();
  });
});
document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape') fecharModais();
});

function selecionarAba(aba) {
  const abas = ['clientes', 'servicos', 'atendimentos'];
  abas.forEach((nome) => {
    const ativo = aba === nome;
    document.getElementById(`painel-${nome}`).hidden = !ativo;
    document.getElementById(`aba-${nome}`).classList.toggle('ativa', ativo);
    document.getElementById(`aba-${nome}`).setAttribute('aria-selected', String(ativo));
  });
  document.getElementById('form-busca-global').hidden = aba !== 'clientes';
}

document.getElementById('aba-clientes').addEventListener('click', () => selecionarAba('clientes'));
document.getElementById('aba-servicos').addEventListener('click', async () => {
  selecionarAba('servicos');
  await carregarServicos();
});
document.getElementById('listar-servicos').addEventListener('click', async () => {
  selecionarAba('servicos');
  await carregarServicos();
});
document.getElementById('aba-atendimentos').addEventListener('click', async () => {
  selecionarAba('atendimentos');
  await carregarAtendimentos();
});
document.getElementById('form-busca-global').addEventListener('submit', (evento) => evento.preventDefault());
document.getElementById('busca-global').addEventListener('input', () => {
  selecionarAba('clientes');
  renderizarClientes();
});
document.getElementById('filtro-global').addEventListener('change', () => {
  selecionarAba('clientes');
  renderizarClientes();
});
document.getElementById('busca-clientes').addEventListener('input', renderizarClientes);
document.getElementById('busca-servicos').addEventListener('input', () => renderizarServicos());

function mostrarMensagem(elemento, texto) {
  elemento.textContent = texto;
  elemento.classList.add('mostrar');
}

function limparMensagem(elemento) {
  elemento.textContent = '';
  elemento.classList.remove('mostrar');
}

function prepararFormularioCliente() {
  const formulario = document.getElementById('form-cadastro-cliente');
  formulario.reset();
  delete formulario.dataset.clienteId;
  document.getElementById('titulo-modal-cliente').textContent = 'Cadastro > Clientes';
  document.getElementById('salvar-cliente').textContent = 'Cadastrar cliente';
  limparMensagem(mensagemErroCliente);
}

function prepararFormularioServico() {
  const formulario = document.getElementById('form-cadastro-servico');
  formulario.reset();
  delete formulario.dataset.servicoId;
  document.getElementById('titulo-modal-servico').textContent = 'Cadastro > Serviços';
  document.getElementById('salvar-servico').textContent = 'Cadastrar serviço';
}

function prepararFormularioAtendimento() {
  const formulario = document.getElementById('form-cadastro-atendimento');
  formulario.reset();
  delete formulario.dataset.atendimentoId;
  document.getElementById('titulo-modal-atendimento').textContent = 'Novo atendimento';
  document.getElementById('salvar-atendimento').textContent = 'Adicionar à fila';
  document.getElementById('campo-status-atendimento').hidden = true;
  document.getElementById('cliente-atendimento').value = '';
  document.getElementById('data-atendimento').min = hojeLocalIso();
  atualizarCamposClienteAtendimento();
}

async function requisitarJson(url, opcoes = {}) {
  const resposta = await fetch(`${apiUrl}${url}`, opcoes);
  const dados = await resposta.json();
  if (!resposta.ok) {
    const erro = new Error(dados.mensagem || 'Não foi possível concluir a operação.');
    erro.status = resposta.status;
    throw erro;
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
  if (numeros.length === 8) return `${numeros.slice(0, 4)}-${numeros.slice(4)}`;
  if (numeros.length === 9) return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
  const codigoArea = numeros.slice(0, 2);
  const tamanhoNumero = numeros.length === 11 ? 5 : 4;
  return `(${codigoArea}) ${numeros.slice(2, 2 + tamanhoNumero)}-${numeros.slice(2 + tamanhoNumero)}`;
}

function hojeLocalIso() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function validarDadosCliente(dados) {
  if (!dados.nome || !dados.telefone.trim() || !dados.idade || !dados.cep || !dados.servicoId) {
    return 'Preencha todos os campos obrigatórios e escolha um serviço.';
  }
  if (!/^[\p{L}]+(?:\s+[\p{L}]+)*$/u.test(dados.nome.normalize('NFC'))) {
    return 'O nome deve conter apenas letras e espaços.';
  }
  if (!/^[\d()\s-]+$/.test(dados.telefone.trim()) ||
      ![8, 9, 10, 11].includes(dados.telefone.replace(/\D/g, '').length)) {
    return 'Informe um telefone válido com 8 ou 9 dígitos, com ou sem DDD.';
  }
  if (!/^\d{1,3}$/.test(dados.idade) || Number(dados.idade) < 1 || Number(dados.idade) > 120) {
    return 'A idade deve ser um número inteiro entre 1 e 120.';
  }
  if (!/^[\d\s-]+$/.test(dados.cep.trim()) || dados.cep.replace(/\D/g, '').length !== 8) {
    return 'Informe um CEP com 8 números.';
  }
  return '';
}

function formatarCep(cep) {
  const numeros = cep.replace(/\D/g, '');
  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
}

function normalizarBusca(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
    .replace(/\s+/g, ' ');
}

function correspondeBusca(texto, busca) {
  const campos = normalizarBusca(texto);
  const termos = normalizarBusca(busca).split(' ').filter(Boolean);
  return termos.every((termo) => campos.includes(termo));
}

function calcularIdade(dataNascimento) {
  const [ano, mes, dia] = String(dataNascimento).split('-').map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade--;
  return idade;
}

function idadeDoCliente(cliente) {
  if (Number.isInteger(cliente.idade)) return cliente.idade;
  const idade = cliente.dataNascimento ? calcularIdade(cliente.dataNascimento) : '';
  return Number.isInteger(idade) && idade >= 1 && idade <= 120 ? idade : '';
}

async function carregarClientes() {
  const lista = document.getElementById('lista-clientes');
  lista.replaceChildren();

  try {
    clientesCarregados = await requisitarJson('/clientes');
    renderizarClientes();
  } catch (erro) {
    const mensagem = document.createElement('p');
    mensagem.className = 'mensagem-lista';
    mensagem.textContent = erro.message || 'Não foi possível carregar os clientes.';
    lista.append(mensagem);
  }
}

function renderizarClientes() {
  const lista = document.getElementById('lista-clientes');
  const buscaLocal = normalizarBusca(document.getElementById('busca-clientes').value.trim());
  const buscaGlobal = normalizarBusca(document.getElementById('busca-global').value.trim());
  const filtroGlobal = document.getElementById('filtro-global').value;
  const clientes = clientesCarregados.filter((cliente) => {
    const camposLocais = `${cliente.nome} ${cliente.servicoNome}`;
    if (buscaLocal && !correspondeBusca(camposLocais, buscaLocal)) return false;
    if (!buscaGlobal) return true;
    if (filtroGlobal === 'servico') return correspondeBusca(cliente.servicoNome, buscaGlobal);
    if (filtroGlobal === 'idade') {
      const idadeBusca = Number(buscaGlobal.replace(/\s*anos?$/, '').trim());
      return Number.isInteger(idadeBusca) && Number(idadeDoCliente(cliente)) === idadeBusca;
    }
    return correspondeBusca(cliente.nome, buscaGlobal);
  });
  lista.replaceChildren();

  if (clientes.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'mensagem-lista';
      vazio.textContent = clientesCarregados.length
        ? 'Nenhum cliente encontrado para essa pesquisa.'
        : 'Ainda não há clientes cadastrados.';
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
      if (cliente.dataNascimento) adicionarTexto(card, 'Nascimento', formatarData(cliente.dataNascimento));
      adicionarTexto(card, 'Idade', `${idadeDoCliente(cliente)} anos`);
      if (cliente.cep) adicionarTexto(card, 'CEP', formatarCep(cliente.cep));
      adicionarTexto(card, 'Serviço', cliente.servicoNome);
      if (Number.isFinite(cliente.servicoValor)) {
        adicionarTexto(card, 'Valor do serviço', formatarValor(cliente.servicoValor));
      }
      const acoes = document.createElement('div');
      acoes.className = 'acoes-card';
      const editar = document.createElement('button');
      editar.type = 'button';
      editar.className = 'botao-secundario';
      editar.textContent = 'Editar';
      editar.addEventListener('click', () => editarCliente(cliente));
      const excluir = document.createElement('button');
      excluir.type = 'button';
      excluir.className = 'botao-excluir';
      excluir.textContent = 'Excluir';
      excluir.addEventListener('click', () => excluirCliente(cliente));
      acoes.append(editar, excluir);
      card.append(acoes);
      lista.append(card);
  });
}

async function carregarServicos() {
  const seletor = document.getElementById('servico-cad-cliente');
  seletor.replaceChildren();

  try {
    servicosCarregados = await requisitarJson('/servicos');
    const disponiveis = servicosCarregados.filter(
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

    renderizarServicos();
  } catch (erro) {
    seletor.disabled = true;
    const opcaoErro = document.createElement('option');
    opcaoErro.textContent = erro.message || 'Não foi possível carregar os serviços.';
    seletor.append(opcaoErro);
    renderizarServicos(erro.message || 'Não foi possível carregar os serviços.');
  }
}

function renderizarServicos(erroCarregamento = '') {
  const lista = document.getElementById('lista-servicos');
  const busca = document.getElementById('busca-servicos').value;
  const servicos = servicosCarregados.filter((servico) => {
    const campos = [
      servico.nome,
      formatarDuracao(servico.duracaoMinutos),
      servico.valor,
      formatarValor(servico.valor),
      servico.ofertado ? 'ofertado disponível' : 'não ofertado indisponível'
    ].join(' ');
    return correspondeBusca(campos, busca);
  });
  lista.replaceChildren();

  if (erroCarregamento) {
    const mensagem = document.createElement('p');
    mensagem.className = 'mensagem-lista';
    mensagem.textContent = erroCarregamento;
    lista.append(mensagem);
    return;
  }
  if (servicos.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'mensagem-lista';
    vazio.textContent = servicosCarregados.length
      ? 'Nenhum serviço encontrado para essa pesquisa.'
      : 'Nenhum serviço cadastrado.';
    lista.append(vazio);
    return;
  }

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
        const acoes = document.createElement('div');
        acoes.className = 'acoes-card acoes-servico';
        const editar = document.createElement('button');
        editar.type = 'button';
        editar.className = 'botao-secundario';
        editar.textContent = 'Editar';
        editar.addEventListener('click', () => editarServico(servico));
        const excluir = document.createElement('button');
        excluir.type = 'button';
        excluir.className = 'botao-excluir';
        excluir.textContent = 'Excluir';
        excluir.addEventListener('click', () => excluirServico(servico));
        acoes.append(botao, editar, excluir);
        item.append(informacoes, acoes);
        lista.append(item);
  });
}

async function carregarAtendimentos() {
  const lista = document.getElementById('lista-atendimentos');
  lista.replaceChildren();
  try {
    atendimentosCarregados = await requisitarJson('/atendimentos');
    renderizarAtendimentos();
  } catch (erro) {
    const mensagem = document.createElement('p');
    mensagem.className = 'mensagem-lista';
    mensagem.textContent = erro.message || 'Não foi possível carregar os atendimentos.';
    lista.append(mensagem);
  }
}

function renderizarAtendimentos() {
  const lista = document.getElementById('lista-atendimentos');
  lista.replaceChildren();
  if (atendimentosCarregados.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'mensagem-lista';
    vazio.textContent = 'Ainda não há atendimentos na fila.';
    lista.append(vazio);
    return;
  }

  const rotulosStatus = {
    aguardando: 'Aguardando',
    'em atendimento': 'Em atendimento',
    concluído: 'Concluído',
    cancelado: 'Cancelado'
  };
  atendimentosCarregados.slice()
    .sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`))
    .forEach((atendimento) => {
      const card = document.createElement('article');
      card.className = 'atendimento-card';
      const nome = document.createElement('h3');
      nome.textContent = atendimento.nome;
      card.append(nome);
      adicionarTexto(card, 'Data e horário', `${formatarData(atendimento.data)} às ${atendimento.horario}`);
      adicionarTexto(card, 'Telefone', formatarTelefone(atendimento.telefone));
      adicionarTexto(card, 'Idade', `${atendimento.idade} anos`);
      adicionarTexto(card, 'Serviço', atendimento.servicoNome);

      const status = document.createElement('span');
      status.className = 'status-atendimento';
      status.dataset.status = atendimento.status;
      status.textContent = rotulosStatus[atendimento.status] || atendimento.status;
      card.append(status);

      const seletorStatus = document.createElement('select');
      seletorStatus.className = 'seletor-status-atendimento';
      seletorStatus.setAttribute('aria-label', `Alterar status de ${atendimento.nome}`);
      Object.entries(rotulosStatus).forEach(([valor, rotulo]) => {
        const opcao = document.createElement('option');
        opcao.value = valor;
        opcao.textContent = rotulo;
        seletorStatus.append(opcao);
      });
      seletorStatus.value = atendimento.status;
      seletorStatus.addEventListener('change', () => alterarStatusAtendimento(atendimento, seletorStatus.value));

      const acoes = document.createElement('div');
      acoes.className = 'acoes-card';
      const editar = document.createElement('button');
      editar.type = 'button';
      editar.className = 'botao-secundario';
      editar.textContent = 'Editar';
      editar.addEventListener('click', () => editarAtendimento(atendimento));
      const remover = document.createElement('button');
      remover.type = 'button';
      remover.className = 'botao-excluir';
      remover.textContent = 'Remover';
      remover.addEventListener('click', () => excluirAtendimento(atendimento));
      acoes.append(editar, remover);
      card.append(seletorStatus, acoes);
      lista.append(card);
    });
}

function atualizarSelecaoClienteAtendimento() {
  const seletor = document.getElementById('cliente-atendimento');
  seletor.replaceChildren();
  const novo = document.createElement('option');
  novo.value = '';
  novo.textContent = 'Novo cliente';
  seletor.append(novo);
  clientesCarregados.forEach((cliente) => {
    const opcao = document.createElement('option');
    opcao.value = cliente.id;
    opcao.textContent = `${cliente.nome} - ${formatarTelefone(cliente.telefone)}`;
    seletor.append(opcao);
  });
}

function atualizarCamposClienteAtendimento() {
  const seletor = document.getElementById('cliente-atendimento');
  const cliente = clientesCarregados.find((item) => String(item.id) === seletor.value);
  const campos = {
    nome: document.getElementById('nome-atendimento'),
    telefone: document.getElementById('telefone-atendimento'),
    idade: document.getElementById('idade-atendimento')
  };
  campos.nome.value = cliente?.nome || '';
  campos.telefone.value = cliente ? formatarTelefone(cliente.telefone) : '';
  campos.idade.value = cliente ? idadeDoCliente(cliente) : '';
  Object.values(campos).forEach((campo) => {
    campo.readOnly = Boolean(cliente);
  });
}

function preencherServicosAtendimento() {
  const seletor = document.getElementById('servico-atendimento');
  const disponiveis = servicosCarregados.filter((servico) => servico.ofertado);
  seletor.replaceChildren();
  const inicial = document.createElement('option');
  inicial.value = '';
  inicial.textContent = disponiveis.length ? 'Selecione um serviço' : 'Nenhum serviço ofertado';
  seletor.append(inicial);
  seletor.disabled = disponiveis.length === 0;
  disponiveis.forEach((servico) => {
    const opcao = document.createElement('option');
    opcao.value = servico.id;
    opcao.textContent = servico.nome;
    seletor.append(opcao);
  });
}

function editarAtendimento(atendimento) {
  prepararFormularioAtendimento();
  const formulario = document.getElementById('form-cadastro-atendimento');
  formulario.dataset.atendimentoId = atendimento.id;
  document.getElementById('titulo-modal-atendimento').textContent = 'Editar atendimento';
  document.getElementById('salvar-atendimento').textContent = 'Salvar alterações';
  document.getElementById('campo-status-atendimento').hidden = false;
  atualizarSelecaoClienteAtendimento();
  preencherServicosAtendimento();
  document.getElementById('cliente-atendimento').value = atendimento.clienteId || '';
  atualizarCamposClienteAtendimento();
  document.getElementById('nome-atendimento').value = atendimento.nome;
  document.getElementById('telefone-atendimento').value = formatarTelefone(atendimento.telefone);
  document.getElementById('idade-atendimento').value = atendimento.idade;
  document.getElementById('data-atendimento').value = atendimento.data;
  document.getElementById('horario-atendimento').value = atendimento.horario;
  document.getElementById('servico-atendimento').value = atendimento.servicoId;
  document.getElementById('status-atendimento').value = atendimento.status;
  abrirModal(document.getElementById('cadastro_atendimento'));
}

async function alterarStatusAtendimento(atendimento, status) {
  const url = `/atendimentos/${encodeURIComponent(atendimento.id)}/status`;
  const enviar = (confirmarConflito = false) => requisitarJson(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...(confirmarConflito ? { confirmarConflito: true } : {}) })
  });
  try {
    try {
      await enviar();
    } catch (erro) {
      if (erro.status !== 409) throw erro;
      if (!window.confirm(erro.message)) {
        await carregarAtendimentos();
        return;
      }
      await enviar(true);
    }
    await carregarAtendimentos();
  } catch (erro) {
    window.alert(erro.message || 'Não foi possível alterar o status.');
    await carregarAtendimentos();
  }
}

async function excluirAtendimento(atendimento) {
  if (!window.confirm(`Deseja remover o atendimento de ${atendimento.nome}?`)) return;
  try {
    await requisitarJson(`/atendimentos/${encodeURIComponent(atendimento.id)}`, { method: 'DELETE' });
    await carregarAtendimentos();
  } catch (erro) {
    window.alert(erro.message || 'Não foi possível remover o atendimento.');
  }
}

const formAtendimento = document.getElementById('form-cadastro-atendimento');
const mensagemErroAtendimento = document.getElementById('mensagem-erro-atendimento');
formAtendimento.noValidate = true;
document.getElementById('cliente-atendimento').addEventListener('change', atualizarCamposClienteAtendimento);
formAtendimento.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limparMensagem(mensagemErroAtendimento);
  const dadosAtendimento = {
    clienteId: document.getElementById('cliente-atendimento').value || null,
    nome: document.getElementById('nome-atendimento').value.trim().normalize('NFC').replace(/\s+/g, ' '),
    telefone: document.getElementById('telefone-atendimento').value.trim(),
    idade: document.getElementById('idade-atendimento').value,
    data: document.getElementById('data-atendimento').value,
    horario: document.getElementById('horario-atendimento').value,
    servicoId: document.getElementById('servico-atendimento').value,
    status: document.getElementById('status-atendimento').value
  };
  if (!dadosAtendimento.nome || !dadosAtendimento.telefone || !dadosAtendimento.idade ||
      !dadosAtendimento.data || !dadosAtendimento.horario || !dadosAtendimento.servicoId) {
    mostrarMensagem(mensagemErroAtendimento, 'Preencha todos os campos obrigatórios.');
    return;
  }
  if (!/^[\p{L}]+(?:\s+[\p{L}]+)*$/u.test(dadosAtendimento.nome.normalize('NFC'))) {
    mostrarMensagem(mensagemErroAtendimento, 'O nome deve conter apenas letras e espaços.');
    return;
  }
  if (!/^[\d()\s-]+$/.test(dadosAtendimento.telefone) ||
      ![8, 9, 10, 11].includes(dadosAtendimento.telefone.replace(/\D/g, '').length)) {
    mostrarMensagem(mensagemErroAtendimento, 'Informe um telefone válido com 8 ou 9 dígitos, com ou sem DDD.');
    return;
  }
  if (!/^\d{1,3}$/.test(dadosAtendimento.idade) ||
      Number(dadosAtendimento.idade) < 1 || Number(dadosAtendimento.idade) > 120) {
    mostrarMensagem(mensagemErroAtendimento, 'A idade deve ser um número inteiro entre 1 e 120.');
    return;
  }
  if (dadosAtendimento.data < hojeLocalIso()) {
    mostrarMensagem(mensagemErroAtendimento, 'A data do atendimento não pode estar no passado.');
    return;
  }

  const atendimentoId = formAtendimento.dataset.atendimentoId;
  const url = atendimentoId ? `/atendimentos/${encodeURIComponent(atendimentoId)}` : '/atendimentos';
  const enviar = (confirmarConflito = false) => requisitarJson(url, {
    method: atendimentoId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...dadosAtendimento, ...(confirmarConflito ? { confirmarConflito: true } : {}) })
  });
  try {
    try {
      await enviar();
    } catch (erro) {
      if (erro.status !== 409) throw erro;
      if (!window.confirm(erro.message)) return;
      await enviar(true);
    }
    fecharModais();
    prepararFormularioAtendimento();
    await carregarAtendimentos();
  } catch (erro) {
    mostrarMensagem(mensagemErroAtendimento, erro.message || 'Não foi possível salvar o atendimento.');
  }
});

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

async function editarCliente(cliente) {
  prepararFormularioCliente();
  limparMensagem(mensagemErroCliente);
  abrirModal(document.getElementById('cadastro_cliente'));
  await carregarServicos();
  const formulario = document.getElementById('form-cadastro-cliente');
  formulario.dataset.clienteId = cliente.id;
  document.getElementById('nome-cad-cliente').value = cliente.nome;
  document.getElementById('telefone-cad-cliente').value = formatarTelefone(cliente.telefone);
  document.getElementById('idade-cad-cliente').value = idadeDoCliente(cliente);
  document.getElementById('cep-cad-cliente').value = formatarCep(cliente.cep);
  document.getElementById('servico-cad-cliente').value = cliente.servicoId;
  document.getElementById('titulo-modal-cliente').textContent = 'Editar cliente';
  document.getElementById('salvar-cliente').textContent = 'Salvar alterações';
}

async function excluirCliente(cliente) {
  if (!window.confirm(`Deseja excluir o cliente ${cliente.nome}?`)) return;
  try {
    await requisitarJson(`/clientes/${encodeURIComponent(cliente.id)}`, { method: 'DELETE' });
    await carregarClientes();
  } catch (erro) {
    window.alert(erro.message || 'Não foi possível excluir o cliente.');
  }
}

function editarServico(servico) {
  prepararFormularioServico();
  limparMensagem(mensagemErroServico);
  const formulario = document.getElementById('form-cadastro-servico');
  formulario.dataset.servicoId = servico.id;
  document.getElementById('nome-servico').value = servico.nome;
  document.getElementById('duracao-servico').value = servico.duracaoMinutos;
  document.getElementById('valor-servico').value = servico.valor;
  document.getElementById('titulo-modal-servico').textContent = 'Editar serviço';
  document.getElementById('salvar-servico').textContent = 'Salvar alterações';
  abrirModal(document.getElementById('cadastro_servico'));
}

async function excluirServico(servico) {
  if (!window.confirm(`Deseja excluir o serviço ${servico.nome}? Os dados já registrados nos clientes serão mantidos.`)) return;
  try {
    await requisitarJson(`/servicos/${encodeURIComponent(servico.id)}`, { method: 'DELETE' });
    await carregarServicos();
  } catch (erro) {
    window.alert(erro.message || 'Não foi possível excluir o serviço.');
  }
}

const telefoneInput = document.getElementById('telefone-cad-cliente');
telefoneInput.addEventListener('input', () => {
  const numeros = telefoneInput.value.replace(/\D/g, '').slice(0, 11);
  if (numeros.length >= 10 && numeros.length <= 10) {
    telefoneInput.value = numeros.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (numeros.length === 11) {
    telefoneInput.value = numeros.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
  } else {
    telefoneInput.value = numeros;
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
formCliente.noValidate = true;
formCliente.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limparMensagem(mensagemErroCliente);

  const dadosCliente = {
    nome: document.getElementById('nome-cad-cliente').value.trim().normalize('NFC').replace(/\s+/g, ' '),
    telefone: telefoneInput.value,
    idade: document.getElementById('idade-cad-cliente').value,
    cep: cepInput.value,
    servicoId: document.getElementById('servico-cad-cliente').value
  };
  const erroValidacao = validarDadosCliente(dadosCliente);
  if (erroValidacao) {
    mostrarMensagem(mensagemErroCliente, erroValidacao);
    return;
  }

  try {
    const clienteId = formCliente.dataset.clienteId;
    await requisitarJson(clienteId ? `/clientes/${encodeURIComponent(clienteId)}` : '/clientes', {
      method: clienteId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosCliente)
    });
    prepararFormularioCliente();
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
    const servicoId = formServico.dataset.servicoId;
    await requisitarJson(servicoId ? `/servicos/${encodeURIComponent(servicoId)}` : '/servicos', {
      method: servicoId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosServico)
    });
    prepararFormularioServico();
    await carregarServicos();
    await carregarClientes();
    fecharModais();
  } catch (erro) {
    mostrarMensagem(mensagemErroServico, erro.message || 'Não foi possível cadastrar o serviço.');
  }
});

document.getElementById('voltarHome').addEventListener('click', () => {
  window.location.href = '../html/login.html';
});

carregarClientes();
carregarServicos();
carregarAtendimentos();
