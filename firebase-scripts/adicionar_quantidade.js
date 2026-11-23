const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Inicializa a app usando o ID do projeto no Google Cloud Shell
initializeApp({
  projectId: 'miguel-inventory'
});

const db = getFirestore();
const COLLECTION_NAME = 'inventario';

async function atualizarQuantidadeExistente() {
  console.log('🔍 A procurar documentos no Firestore...');
  
  const snapshot = await db.collection(COLLECTION_NAME).get();
  
  if (snapshot.empty) {
    console.log('⚠️ Nenhum documento encontrado na coleção.');
    process.exit(0);
  }

  console.log(`📋 Total de documentos encontrados: ${snapshot.size}`);

  let batch = db.batch();
  let count = 0;
  let documentosAtualizados = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();

    // Adiciona o campo Quantidade apenas se ele ainda não existir
    if (data.Quantidade === undefined) {
      batch.update(doc.ref, { Quantidade: 1 });
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

  console.log(`✅ Sucesso! O campo Quantidade: 1 foi adicionado a ${documentosAtualizados} documentos.`);
  process.exit(0);
}

atualizarQuantidadeExistente().catch((err) => {
  console.error('❌ Erro ao atualizar documentos:', err);
  process.exit(1);
});
