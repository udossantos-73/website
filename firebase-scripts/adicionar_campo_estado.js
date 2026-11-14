const admin = require('firebase-admin');

// Inicialização automática para o ambiente Google Cloud / Cloud Shell
admin.initializeApp({
  projectId: 'miguel-inventory'
});

const db = admin.firestore();

async function adicionarCampoEstado() {
  const colecoes = ['lego_items', 'funko_items', 'hotwheels_items'];

  for (const nomeColecao of colecoes) {
    console.log(`A verificar a coleção: ${nomeColecao}...`);
    
    try {
      const snapshot = await db.collection(nomeColecao).get();

      if (snapshot.empty) {
        console.log(`> Coleção ${nomeColecao} vazia ou não encontrada.`);
        continue;
      }

      const batch = db.batch();
      let contador = 0;

      snapshot.forEach((doc) => {
        const dados = doc.data();
        // Se o documento ainda não tiver o campo 'estado', define como 'adquirido' por defeito
        if (!dados.estado) {
          batch.update(doc.ref, { estado: 'adquirido' });
          contador++;
        }
      });

      if (contador > 0) {
        await batch.commit();
        console.log(`> Adicionado campo 'estado' em ${contador} documentos na coleção ${nomeColecao}.`);
      } else {
        console.log(`> Nenhum documento precisava de atualização em ${nomeColecao}.`);
      }
    } catch (erro) {
      console.log(`> Erro ao aceder à coleção ${nomeColecao}:`, erro.message);
    }
  }
  console.log('Processo de migração concluído com sucesso!');
}

adicionarCampoEstado().catch(console.error);
