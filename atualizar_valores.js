const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const axios = require('axios');

// 1. Configuração de Credenciais do Firebase
let credential;

if (process.env.GCP_SA_KEY) {
  try {
    const serviceAccount = JSON.parse(process.env.GCP_SA_KEY);
    credential = cert(serviceAccount);
    console.log('🔑 Credenciais Firebase: GitHub Secrets.');
  } catch (e) {
    console.error('❌ Erro ao analisar GCP_SA_KEY:', e);
    process.exit(1);
  }
} else {
  credential = applicationDefault();
  console.log('🔑 Credenciais Firebase: Cloud Shell (Application Default).');
}

initializeApp({
  credential,
  projectId: 'miguel-inventory'
});

const db = getFirestore();
const COLLECTION_NAME = 'inventario';

// Define a tua API Key do Rebrickable
const REBRICKABLE_API_KEY = process.env.REBRICKABLE_API_KEY || '52c39bed082b481c5653232cb85f5bbb';

// 2. Consulta à API Oficial do Rebrickable
async function obterValorMercadoLego(setNum) {
  if (!setNum) return null;

  try {
    // O Rebrickable utiliza o formato "SET_NUM-1"
    const setFormatted = setNum.toString().includes('-') ? setNum : `${setNum}-1`;
    const url = `https://rebrickable.com/api/v3/lego/sets/${setFormatted}/`;
    
    const { data } = await axios.get(url, {
      headers: { 'Authorization': `key ${REBRICKABLE_API_KEY}` },
      timeout: 10000
    });

    // Tenta obter o preço recomendado de retalho (RRP) em USD/EUR, se disponível na API
    return data.retail_price || null;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      console.warn(`⚠️ Set LEGO #${setNum} não encontrado no Rebrickable.`);
    } else {
      console.warn(`⚠️ Erro ao consultar Rebrickable para o Set #${setNum}: ${err.message}`);
    }
    return null;
  }
}

// 3. Processamento do Inventário
async function processarAtualizacao() {
  console.log('🔄 A iniciar atualização de mercado via API do Rebrickable...');

  const snapshot = await db.collection(COLLECTION_NAME).get();

  if (snapshot.empty) {
    console.log('⚠️ Nenhum documento encontrado.');
    process.exit(0);
  }

  const hoje = new Date().toISOString().split('T')[0];
  let atualizados = 0;
  let mantidos = 0;

  for (const doc of snapshot.docs) {
    const item = doc.data();
    let novoValor = null;

    if (item.Marca === 'Lego' || item.Tipo === 'Set') {
      novoValor = await obterValorMercadoLego(item.NumeroNaColecao);
    }

    const valorFinal = novoValor !== null ? novoValor : (item.ValorMercado !== undefined ? item.ValorMercado : (item.Preco || 0));

    await doc.ref.update({
      ValorMercado: valorFinal,
      UltimaAtualizacaoValor: hoje
    });

    if (novoValor !== null) {
      console.log(`✅ [LEGO ${item.NumeroNaColecao}] ${item.NomeNaColecao || 'Set'}: ${valorFinal} €`);
      atualizados++;
    } else {
      console.log(`ℹ️ [${item.Marca || 'Outro'}] ${item.NomeNaColecao || doc.id}: Mantido em ${valorFinal} €`);
      mantidos++;
    }

    // O limite gratuito da API do Rebrickable é de 1 pedido por segundo
    await new Promise(res => setTimeout(res, 1100));
  }

  console.log('\n--- RESUMO DA OPERAÇÃO ---');
  console.log(`🗓️ Data: ${hoje}`);
  console.log(`✅ Cotações atualizadas via API: ${atualizados}`);
  console.log(`ℹ️ Cotações mantidas: ${mantidos}`);

  process.exit(0);
}

processarAtualizacao().catch((err) => {
  console.error('❌ Erro crítico:', err);
  process.exit(1);
});