const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const cheerio = require('cheerio');

// Autenticação automática do Cloud Shell
initializeApp({
  projectId: 'miguel-inventory'
});

const db = getFirestore();
const COLLECTION_NAME = 'inventario';

// Função para fazer scraping das imagens no Brickset
async function obterImagensLego(setNum) {
  const urlPagina = `https://brickset.com/sets/${setNum}-1`;
  const imagens = [];

  try {
    const { data } = await axios.get(urlPagina, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(data);

    // 1. Imagem do Set
    const imgSet = $('#boximage img').attr('src') || $('.mainimage img').attr('src');
    if (imgSet) imagens.push(imgSet);

    // 2. Imagem da Caixa (se existir)
    const imgBox = $('a.lightbox[title*="box" i], a.lightbox[title*="Box" i]').attr('href');
    if (imgBox) {
      imagens.push(imgBox);
    } else if (imgSet) {
      const fallbackBox = imgSet.replace('-1.jpg', '-1_back.jpg');
      imagens.push(fallbackBox);
    }
  } catch (err) {
    console.warn(`⚠️ Não foi possível obter imagens para o set ${setNum}. A usar link genérico...`);
    imagens.push(`https://images.brickset.com/sets/Large/${setNum}-1.jpg`);
  }

  return imagens;
}

async function processarCSV() {
  const rows = [];

  fs.createReadStream('lego.csv')
    .pipe(csv({ separator: ',' }))
    .on('data', (data) => rows.push(data))
    .on('end', async () => {
      console.log(`📋 Total de sets a processar: ${rows.length}`);
      
      let batch = db.batch();
      let count = 0;

      for (const row of rows) {
        const setNum = (row['Numero do Set'] || row['NumeroNaColecao'] || '').trim();
        if (!setNum) continue;

        console.log(`🔍 A obter imagens para o Set LEGO ${setNum}...`);
        const listaImagens = await obterImagensLego(setNum);

        const precoBruto = row['Preço'] || row['Preco'] || '0';
        const precoNum = parseFloat(String(precoBruto).replace('€', '').replace(',', '.').trim()) || 0;

        const itemLego = {
          Marca: "Lego",
          Tipo: "Set",
          Colecao: row['Tema'] || row['Colecao'] || "Lego",
          NomeNaColecao: row['Nome do Set'] || row['NomeNaColecao'] || "",
          NumeroNaColecao: parseInt(setNum, 10) || 0,
          Ano: parseInt(row['Ano'], 10) || null,
          Preco: precoNum,
          Quantidade: parseInt(row['Quantidade'], 10) || 1,
          Colecionado: true,
          Pertence: "Miguel",
          Descricao: row['Sub-tema'] ? `Sub-tema: ${row['Sub-tema']}` : (row['Descricao'] || ""),
          Imagem: listaImagens
        };

        const docRef = db.collection(COLLECTION_NAME).doc();
        batch.set(docRef, itemLego);
        count++;

        if (count === 500) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      console.log('✅ Todos os sets LEGO foram importados com sucesso para o Firestore!');
      process.exit(0);
    });
}

processarCSV().catch((err) => {
  console.error('❌ Erro na importação:', err);
  process.exit(1);
});
