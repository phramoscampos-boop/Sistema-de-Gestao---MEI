import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();

app.use(cors());
app.use(express.json());

// Caminhos dos arquivos JSON
const usersFilePath = new URL('./data/users.json', import.meta.url);
const clientesFilePath = new URL('./data/clientes.json', import.meta.url);
const servicosFilePath = new URL('./data/servicos.json', import.meta.url);

// Função auxilar para ler os arquivos JSON
function lerArquivo(caminho) {
    if (!fs.existsSync(caminho)) return [];
    try {
        const rawData = fs.readFileSync(caminho, 'utf-8');
        return rawData ? JSON.parse(rawData) : [];
    } catch (error) {
        return [];
    }
}

// Função auxiliar para salvar nos arquivos JSON
function salvarArquivo(caminho, dados) {
    fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
}

// ================= ROTA DE LOGIN =================
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    const users = lerArquivo(usersFilePath);

    const user = users.find(u => u.user === usuario && u.password === senha);

    if (user) {
        return res.status(200).json({ 
            success: true, 
            message: "Login realizado com sucesso!",
            nome: user.nome
        });
    }
    
    return res.status(401).json({ 
        success: false, 
        message: "Usuário ou senha incorretos." 
    });
});

// ================= ROTAS DE CLIENTES =================
app.get('/clientes', (req, res) => {
    const clientes = lerArquivo(clientesFilePath);
    return res.status(200).json(clientes);
});

app.post('/cadastrar-cliente', (req, res) => {
    const novoCliente = req.body; 
    const clientes = lerArquivo(clientesFilePath);

    novoCliente.id = Date.now(); 
    clientes.push(novoCliente);

    salvarArquivo(clientesFilePath, clientes);

    return res.status(201).json({ 
        success: true, 
        message: "Cliente cadastrado com sucesso!" 
    });
});

// ================= ROTAS DE SERVIÇOS =================
app.get('/servicos', (req, res) => {
    const servicos = lerArquivo(servicosFilePath);
    return res.status(200).json(servicos);
});

app.post('/cadastrar-servico', (req, res) => {
    const novoServico = req.body;
    const servicos = lerArquivo(servicosFilePath);

    novoServico.id = Date.now();
    novoServico.data = new Date().toLocaleDateString('pt-BR');
    servicos.push(novoServico);

    salvarArquivo(servicosFilePath, servicos);

    return res.status(201).json({ 
        success: true, 
        message: "Serviço registrado com sucesso!" 
    });
});

app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));