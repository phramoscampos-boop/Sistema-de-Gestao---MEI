import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
const clientes = [
    {
        id: 1,
        nome: "Pedro",
        email: "pedro@email.com"
    },
    {
        id: 2,
        nome: "Letícia",
        email: "leticia@email.com"
    }

];

app.use(cors());
app.use(express.json());

// MÉTODO GET
app.get("/clientes", (req, res) => {
    res.json(clientes);
});

app.get("/clientes/:id", (req, res) => {
    const cliente = clientes.find((cliente) => {
        return cliente.id === Number(req.params.id);
    });

    /* Se não achar o cliente: a função de buscar cliente encerra por aqui, mostrando o erro HTTP 404(not found)
       e mostra um arquivo .json contendo a mensagem "Cliente não encontrado"*/
    if (!cliente) {
        return res.status(404).json({
            mensagem: "Cliente não encontrado"
        });
    }

    res.json(cliente);
});

// MÉTODO POST

app.post("/clientes", (req, res) => {
    const { nome, email } = req.body;

    const ultimoIdCliente = clientes[clientes.length - 1].id;
    const novoId = ultimoIdCliente + 1;
});

const cliente = {
    
}
// // MÉTODO LISTAR
app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});