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
      
      // Determina o estado com a primeira letra maiúscula com base no campo antigo 'Colecionado'
      let novoEstado = 'Adquirido'; // valor predefinido
      if (dados.Colecionado === false) {
        novoEstado = 'Wishlist';
      } else if (dados.Colecionado === true) {
        novoEstado = 'Adquirido';
      }

      // Se já existir um campo 'estado' em minúsculas de uma tentativa anterior, aproveitamos o valor capitalizado
      if (dados.estado) {
        const val = dados.estado.toLowerCase();
        if (val === 'wishlist') novoEstado = 'Wishlist';
        if (val === 'encomendado') novoEstado = 'Encomendado';
        if (val === 'adquirido') novoEstado = 'Adquirido';
      }

      // Adiciona o campo 'Estado', remove o antigo 'Colecionado' e limpa o 'estado' antigo se existir
      batch.update(doc.ref, {
        Estado: novoEstado,
        Colecionado: FieldValue.delete(),
        estado: FieldValue.delete() // Remove o campo antigo em minúsculas, caso exista
      });
      contador++;
    });

    if (contador > 0) {
      await batch.commit();
      console.log(`> Migrados ${contador} documentos com sucesso para o campo 'Estado'!`);
    } else {
      console.log(`> Nenhum documento para atualizar.`);
    }
  } catch (erro) {
    console.log(`> Erro ao migrar a coleção:`, erro.message);
  }
}

migrarParaEstado().catch(console.error);
