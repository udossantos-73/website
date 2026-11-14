const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({
  projectId: 'miguel-inventory'
});

const db = getFirestore();

async function migrarParaEstado() {
  const nomeColecao = 'inventario';
  console.log(`A processar a coleção: ${nomeColecao}...`);
  
  try {
    const snapshot = await db.collection(nomeColecao).get();

    if (snapshot.empty) {
      console.log(`> Coleção ${nomeColecao} vazia ou não encontrada.`);
      return;
    }

    const batch = db.batch();
    let contador = 0;

    snapshot.forEach((doc) => {
      const dados = doc.data();
      
      // Determina o novo estado com base no campo antigo 'Colecionado'
      let novoEstado = 'adquirido'; // valor predefinido
      if (dados.Colecionado === false) {
        novoEstado = 'wishlist';
      } else if (dados.Colecionado === true) {
        novoEstado = 'adquirido';
      }

      // Adiciona o novo campo 'estado' e remove o antigo 'Colecionado'
      batch.update(doc.ref, {
        estado: novoEstado,
        Colecionado: FieldValue.delete() // Remove o campo booleano antigo
      });
      contador++;
    });

    if (contador > 0) {
      await batch.commit();
      console.log(`> Migrados ${contador} documentos com sucesso para o campo 'estado'!`);
    } else {
      console.log(`> Nenhum documento para atualizar.`);
    }
  } catch (erro) {
    console.log(`> Erro ao migrar a coleção:`, erro.message);
  }
}

migrarParaEstado().catch(console.error);
