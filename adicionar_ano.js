const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  projectId: 'miguel-inventory'
});

const db = getFirestore();
const COLLECTION_NAME = 'inventario';

async function atualizarAnoExistente() {
  console.log('🔍 A procurar documentos sem o campo Ano...');
  
  const snapshot = await db.collection(COLLECTION_NAME).get();
  
  if (snapshot.empty) {
    console.log('⚠️ Nenhum documento encontrado.');
    process.exit(0);
  }

  let batch = db.batch();
  let count = 0;
  let documentosAtualizados = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();

    // Adiciona o campo Ano se ele ainda não existir no documento
    if (data.Ano === undefined) {
      batch.update(doc.ref, { Ano: null }); // Define como null ou atribui um número se preferires
      count++;
      documentosAtualizados++;
    }

    if (count === 500) {
      batch.commit();
      batch = db.batch();
      count = 0;
    }
  });

  if (count > 0) {
    await batch.commit();
  }

  console.log(`✅ Sucesso! O campo 'Ano: null' foi adicionado a ${documentosAtualizados} documentos.`);
  process.exit(0);
}

atualizarAnoExistente().catch((err) => {
  console.error('❌ Erro ao atualizar documentos:', err);
  process.exit(1);
});