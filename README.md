# Sistema de Gestão - MEI

Aplicação web para cadastro de clientes, gestão de serviços e organização da fila de atendimentos.

## Estrutura

```text
backend/
  data/                       # Dados locais ignorados pelo Git (exceto configurações padrão)
  src/
    controllers/
      authController.js       # Autenticação, sessões e gestão de contas
      settingsController.js   # Configuração persistida dos turnos
    routes/
      server.js               # Inicializa o Express e registra rotas e arquivos estáticos
    scripts/
      create-owner.js         # Provisionamento local da conta proprietária
    services/
      userService.js          # Consultas, normalização e persistência de usuários no PostgreSQL
    config/
      database.js             # Pool PostgreSQL configurado por variáveis de ambiente
  migrar-clientes.js          # Importa clientes do JSON (executar uma vez)
  migrar-servicos.js          # Importa serviços do JSON (executar uma vez)
  migrar-usuarios.js          # Importa usuários do JSON (executar uma vez)
  test/                       # Testes sequenciais de API e autenticação
frontend/
  assets/images/              # Marca, ícones e imagens
  css/                        # Estilos das telas e módulos
  html/                       # Login, troca de senha e dashboard
  javascript/                 # Autenticação, CRUD e controles do dashboard
```

O servidor resolve os arquivos de dados a partir da raiz de `backend/` e os arquivos estáticos a partir da raiz do projeto. Assim, a localização de `src/routes/server.js` não altera esses caminhos.

## Executar

No diretório `backend/`:

```sh
npm install
npm start
```

A aplicação usa PostgreSQL para usuários, clientes e serviços; atendimentos e configurações ainda usam arquivos JSON locais em `backend/data/`. Esses arquivos de dados pessoais e comerciais são ignorados pelo Git. Em uma instalação nova, o servidor cria automaticamente `atendimentos.json` vazio; restaure os dados de backup local quando necessário. O arquivo `configuracoes.json` contém apenas horários padrão e permanece versionado.

Configure o acesso ao banco antes de iniciar. É possível fornecer `DATABASE_URL` ou configurar as variáveis `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` e `PGPASSWORD`. Na configuração local, o padrão é `localhost:5432`, banco `gestao-mei` e usuário `postgres`; a senha deve ser fornecida por `PGPASSWORD`.

Para migrar os registros JSON existentes, execute cada comando **uma única vez** a partir de `backend/`, após criar as tabelas correspondentes:

```sh
node migrar-clientes.js
node migrar-servicos.js
node migrar-usuarios.js
```

Os importadores precisam dos arquivos JSON de origem (`clientes.json`, `servicos.json` e `users.json`) em `backend/data/`; esses arquivos não são enviados ao Git. O importador de usuários também cria a coluna `pode_gerenciar_usuarios` se ela ainda não existir. Preserve uma cópia dos arquivos JSON até confirmar a migração. Não execute os importadores novamente sobre os mesmos dados, pois eles podem criar registros duplicados.

A aplicação fica disponível em `http://localhost:3000`. Para executar os testes:

```sh
npm test
```

Os testes são sequenciais porque usam temporariamente o JSON local de atendimentos e simulam as consultas PostgreSQL com dados em memória.

Na primeira instalação, crie a conta proprietária localmente com:

```sh
npm run criar-proprietaria -- Elisângela elis@empresa.com
```

O comando cria a conta com a senha inicial `12345` e exige a troca no primeiro acesso. Ele falha se já houver uma proprietária ou se o e-mail estiver em uso. Não há cadastro público de usuários.

## Autenticação e hash de senha

O `bcryptjs` implementa o algoritmo bcrypt. `bcrypt.hash(senha, 10)` gera um salt aleatório e um hash de custo 10; o salt e o custo ficam incorporados no resultado. A senha original não pode ser recuperada do hash. Para autenticar, `bcrypt.compare(senhaInformada, hashArmazenado)` recalcula e compara o valor com segurança.

Senhas antigas em texto simples continuam aceitas apenas para permitir a migração gradual: após o próximo login válido, o servidor as substitui por um hash bcrypt no PostgreSQL. Novas alterações de senha já são persistidas somente como hash.

O servidor mantém a sessão em memória e entrega ao navegador um cookie `HttpOnly` e `SameSite=Strict`, que não pode ser lido por JavaScript. As rotas de dados e a página da dashboard exigem esse cookie. A atividade reinicia o prazo deslizante de uma hora; sem atividade, a interface encerra a sessão e o servidor rejeita acessos posteriores. Reiniciar o servidor encerra as sessões existentes.

Na migração para o banco, o cargo e a permissão `podeGerenciarUsuarios` existentes são preservados. A proprietária e as contas com essa permissão podem cadastrar usuários, promover ou rebaixar contas comuns e excluí-las; contas privilegiadas não podem ser excluídas pelo painel. Administradores e usuários criados depois não recebem automaticamente permissão para gerenciar contas. Novas contas usam a senha padrão `12345`, exigem troca no primeiro acesso e não podem acessar os dados antes dessa troca.

O perfil indica se a conta é Proprietária, Administrador privilegiado, Administrador ou Usuário. Novas contas começam com a senha `12345`; contas privilegiadas podem redefinir a senha de qualquer conta (inclusive outra conta privilegiada), retornando a `12345` e exigindo troca no próximo acesso. Essa senha padrão é fraca e deve ser substituída imediatamente. Cada usuário pode alterar o próprio e-mail no menu de perfil, confirmando a senha atual; endereços já usados por outra conta não são aceitos.

## Módulos

- **Clientes:** nome, telefone, data de nascimento, idade calculada, CEP e data de cadastro. O ano da data de nascimento deve ter quatro dígitos. A seleção de serviços não faz parte do cadastro do cliente.
- **Serviços:** nome, duração, valor e situação de oferta.
- **Fila de atendimento:** cliente, serviço, data, horário e status. A seleção de serviço ocorre neste módulo. A dashboard exibe as quantidades totais por status.
- **Usuários:** contas e cargos de acesso; a dashboard exibe a quantidade total para quem tem permissão de gestão.

A dashboard mostra também a quantidade total de clientes e serviços cadastrados.

Cada módulo tem pesquisa e seletor de atributo. A busca ignora diferenças de acentuação e maiúsculas/minúsculas. Clientes, serviços e fila abrem em lista, com alternância para cards completos. A fila permite filtrar diretamente por status e turno. Usuários podem ser pesquisados por nome, e-mail ou cargo e filtrados pelo cargo.

Os turnos começam como manhã (08:00–12:00) e tarde (13:00–19:00). Contas privilegiadas podem alterar as faixas no módulo da fila; elas servem para filtrar e organizar a visualização, não restringem os horários que podem ser agendados.

Na configuração, cada turno tem campos de início e fim agrupados em um painel próprio. As faixas devem ser válidas, não podem se sobrepor e a manhã deve terminar antes do início da tarde. Após salvar, os horários ficam persistidos em `backend/data/configuracoes.json` e são usados no resumo e no filtro por turno da fila.

## Responsabilidades do código

### Backend

- `backend/src/routes/server.js` resolve os caminhos dos dados e do frontend em relação à raiz do backend, inicia o Express e registra as rotas.
- `backend/src/services/userService.js` consulta usuários no PostgreSQL e remove credenciais do perfil retornado à interface.
- `backend/src/controllers/settingsController.js` valida e persiste as faixas dos turnos em `backend/data/configuracoes.json`.
- `lerRegistros` e `salvarRegistros` leem e persistem as coleções JSON que ainda não migraram; arquivos inválidos geram erro explícito.
- `validarNomeCliente`, `validarTelefoneCliente`, `validarIdade` e `validarCep` normalizam e validam os dados antes de gravá-los.
- `calcularIdade` valida a data de nascimento no formato ISO com ano de quatro dígitos e calcula a idade. `validarDataAtendimento` rejeita datas e horários inválidos ou passados.
- As rotas `/clientes` mantêm os dados pessoais sem serviço associado; `/servicos` gerencia catálogo e disponibilidade; `/atendimentos` seleciona um serviço e verifica conflitos de horário.
- `backend/src/controllers/authController.js` concentra as credenciais e sessões. `fazerLogin` compara senhas e cria sessão; `exigirAutenticacao` protege rotas e renova a sessão; `obterSessaoAtual` consulta a sessão; `fazerLogout` a invalida; `alterarSenha` valida e substitui a senha por hash.

### Frontend

- `frontend/javascript/login.js` valida e envia as credenciais ao servidor; não armazena senhas no navegador.
- `frontend/javascript/auth.js` consulta a sessão do servidor e solicita logout.
- `frontend/javascript/dashboard_script.js` valida a sessão antes de iniciar a tela, controla inatividade e coordena os formulários e módulos.
- O formulário de configuração dos turnos agrupa os horários de manhã e tarde e apresenta a finalidade dos filtros; a persistência e validação das faixas são feitas pelas rotas de configuração no backend.
- `carregarClientes`, `carregarServicos` e `carregarAtendimentos` obtêm os dados da API; `renderizarClientes`, `renderizarServicos` e `renderizarAtendimentos` aplicam pesquisa, ordenação e visualização em lista/cards.
- `normalizarBusca` e `correspondeBusca` preparam os textos e comparam os termos sem diferenciar acentos ou maiúsculas. `calcularIdade` valida a data e calcula a idade exibida.
- Os helpers `atualizarSelecaoClienteAtendimento`, `atualizarCamposClienteAtendimento` e `preencherServicosAtendimento` conectam o cadastro de clientes e o catálogo ao formulário da fila; somente serviços ofertados podem ser selecionados.
