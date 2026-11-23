const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Inicializa o SDK utilizando a autenticação nativa do ambiente Google Cloud
initializeApp({
  credential: applicationDefault(),
  projectId: 'miguel-inventory'
});

const db = getFirestore();
const COLLECTION_NAME = 'inventario';

async function inicializarValorMercado() {
  console.log('🔍 A procurar documentos sem o campo ValorMercado...');
  
  try {
    const snapshot = await db.collection(COLLECTION_NAME).get();
    
    if (snapshot.empty) {
      console.log('⚠️ Nenhum documento encontrado na coleção.');
      process.exit(0);
    }

    console.log(`📋 Total de documentos analisados: ${snapshot.size}`);

    let batch = db.batch();
    let count = 0;
    let documentosAtualizados = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Atribui o campo ValorMercado e UltimaAtualizacaoValor caso ainda não existam
      if (data.ValorMercado === undefined) {
        const valorInicial = typeof data.Preco === 'number' ? data.Preco : 0;
        
        batch.update(doc.ref, { 
          ValorMercado: valorInicial,
          UltimaAtualizacaoValor: null 
        });
        
        count++;
        documentosAtualizados++;
      }

      // Limite de 500 operações por lote (batch) no Firestore
      if (count === 500) {
        batch.commit();
        batch = db.batch();
        count = 0;
      }
    });

    if (count > 0) {
      await batch.commit();
    }

    console.log(`✅ Sucesso! O campo ValorMercado foi adicionado a ${documentosAtualizados} documentos.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao atualizar documentos:', err);
    process.exit(1);
  }
}

inicializarValorMercado();
