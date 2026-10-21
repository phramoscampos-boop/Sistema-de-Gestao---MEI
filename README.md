# Sistema de Gestão - MEI

Aplicação web para cadastro de clientes, gestão de serviços e organização da fila de atendimentos.

## Estrutura

```text
backend/
  data/                       # Coleções JSON persistidas pelo servidor
  src/
    controllers/
      authController.js       # Hash de senhas, sessões, login e logout
    routes/
      server.js               # Inicializa o Express e registra rotas e arquivos estáticos
  test/                       # Testes de API e autenticação
frontend/
  assets/images/              # Marca, ícones e imagens
  css/                        # Estilos das telas e módulos
  html/                       # Login, troca de senha e dashboard
  javascript/                 # Autenticação e comportamento dos módulos
```

O servidor resolve os arquivos de dados a partir da raiz de `backend/` e os arquivos estáticos a partir da raiz do projeto. Assim, a localização de `src/routes/server.js` não altera esses caminhos.

## Executar

No diretório `backend/`:

```sh
npm install
npm start
```

A aplicação fica disponível em `http://localhost:3000`. Para executar os testes:

```sh
npm test
```

Os testes são sequenciais porque usam temporariamente as coleções JSON compartilhadas e restauram os arquivos ao terminar.

## Autenticação e hash de senha

O `bcryptjs` implementa o algoritmo bcrypt. `bcrypt.hash(senha, 10)` gera um salt aleatório e um hash de custo 10; o salt e o custo ficam incorporados no resultado. A senha original não pode ser recuperada do hash. Para autenticar, `bcrypt.compare(senhaInformada, hashArmazenado)` recalcula e compara o valor com segurança.

Senhas antigas em texto simples continuam aceitas apenas para permitir a migração gradual: após o próximo login válido, o servidor as substitui por um hash bcrypt no arquivo de usuários. Novas alterações de senha já são persistidas somente como hash.

O servidor mantém a sessão em memória e entrega ao navegador um cookie `HttpOnly` e `SameSite=Strict`, que não pode ser lido por JavaScript. As rotas de dados e a página da dashboard exigem esse cookie. A atividade reinicia o prazo deslizante de uma hora; sem atividade, a interface encerra a sessão e o servidor rejeita acessos posteriores. Reiniciar o servidor encerra as sessões existentes.

## Módulos

- **Clientes:** nome, telefone, data de nascimento, idade calculada, CEP e data de cadastro. O ano da data de nascimento deve ter quatro dígitos. A seleção de serviços não faz parte do cadastro do cliente.
- **Serviços:** nome, duração, valor e situação de oferta.
- **Fila de atendimento:** cliente, serviço, data, horário e status. A seleção de serviço ocorre neste módulo.

Cada módulo tem pesquisa e seletor de atributo. A busca ignora diferenças de acentuação e maiúsculas/minúsculas.

## Responsabilidades do código

### Backend

- `backend/src/routes/server.js` resolve os caminhos dos dados e do frontend em relação à raiz do backend, inicia o Express e registra as rotas.
- `lerRegistros` e `salvarRegistros` leem e persistem cada coleção JSON; arquivos inválidos geram erro explícito.
- `validarNomeCliente`, `validarTelefoneCliente`, `validarIdade` e `validarCep` normalizam e validam os dados antes de gravá-los.
- `calcularIdade` valida a data de nascimento no formato ISO com ano de quatro dígitos e calcula a idade. `validarDataAtendimento` rejeita datas e horários inválidos ou passados.
- As rotas `/clientes` mantêm os dados pessoais sem serviço associado; `/servicos` gerencia catálogo e disponibilidade; `/atendimentos` seleciona um serviço e verifica conflitos de horário.
- `backend/src/controllers/authController.js` concentra as credenciais e sessões. `fazerLogin` compara senhas e cria sessão; `exigirAutenticacao` protege rotas e renova a sessão; `obterSessaoAtual` consulta a sessão; `fazerLogout` a invalida; `alterarSenha` valida e substitui a senha por hash.

### Frontend

- `frontend/javascript/login.js` valida e envia as credenciais ao servidor; não armazena senhas no navegador.
- `frontend/javascript/auth.js` consulta a sessão do servidor e solicita logout.
- `frontend/javascript/dashboard_script.js` valida a sessão antes de iniciar a tela, controla inatividade e coordena os formulários e módulos.
- `carregarClientes`, `carregarServicos` e `carregarAtendimentos` obtêm os dados da API; `renderizarClientes`, `renderizarServicos` e `renderizarAtendimentos` aplicam o filtro selecionado e constroem os cartões.
- `normalizarBusca` e `correspondeBusca` preparam os textos e comparam os termos sem diferenciar acentos ou maiúsculas. `calcularIdade` valida a data e calcula a idade exibida.
- Os helpers `atualizarSelecaoClienteAtendimento`, `atualizarCamposClienteAtendimento` e `preencherServicosAtendimento` conectam o cadastro de clientes e o catálogo ao formulário da fila; somente serviços ofertados podem ser selecionados.
