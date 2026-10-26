import { criarProprietariaInicial } from '../controllers/authController.js';

const nome = process.argv[2] || 'Elisângela';
const email = process.argv[3] || 'elis@empresa.com';

try {
  const { usuario, senhaTemporaria } = await criarProprietariaInicial(nome, email);
  console.log(`Conta proprietária criada para ${usuario.nome} (${usuario.email}).`);
  console.log('Senha temporária (válida até a primeira troca):');
  console.log(senhaTemporaria);
} catch (erro) {
  console.error(`Não foi possível criar a proprietária: ${erro.message}`);
  process.exitCode = 1;
}
