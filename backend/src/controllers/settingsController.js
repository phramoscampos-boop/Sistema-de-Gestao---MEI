import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const arquivoConfiguracoes = path.resolve(__dirname, '..', '..', 'data', 'configuracoes.json');

function lerHorarios() {
  const conteudo = JSON.parse(fs.readFileSync(arquivoConfiguracoes, 'utf-8'));
  if (!conteudo.horarios || typeof conteudo.horarios !== 'object') {
    throw new Error('A configuração de horários está inválida.');
  }
  return conteudo.horarios;
}

function salvarHorarios(horarios) {
  fs.writeFileSync(arquivoConfiguracoes, JSON.stringify({ horarios }, null, 2));
}

function horarioValido(valor) {
  return typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

function faixaValida(faixa) {
  return faixa && horarioValido(faixa.inicio) && horarioValido(faixa.fim) &&
    faixa.inicio < faixa.fim;
}

export function obterHorarios(req, res) {
  try {
    return res.json(lerHorarios());
  } catch (erro) {
    console.error('Não foi possível ler os horários de funcionamento:', erro.message);
    return res.status(500).json({ mensagem: 'Não foi possível carregar os horários.' });
  }
}

export function atualizarHorarios(req, res) {
  const { manha, tarde } = req.body || {};
  if (!faixaValida(manha) || !faixaValida(tarde) ||
      manha.fim >= tarde.inicio || manha.inicio >= tarde.fim) {
    return res.status(400).json({
      mensagem: 'Informe horários válidos e sem sobreposição para manhã e tarde.'
    });
  }

  try {
    const horarios = {
      manha: { inicio: manha.inicio, fim: manha.fim },
      tarde: { inicio: tarde.inicio, fim: tarde.fim }
    };
    salvarHorarios(horarios);
    return res.json({ mensagem: 'Horários atualizados.', horarios });
  } catch (erro) {
    console.error('Não foi possível salvar os horários de funcionamento:', erro.message);
    return res.status(500).json({ mensagem: 'Não foi possível salvar os horários.' });
  }
}
