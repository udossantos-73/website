// auth-guard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCDbqy7cBEBkIkhiD4dzbhVKq4leduVEYE",
    authDomain: "miguel-inventory.firebaseapp.com",
    projectId: "miguel-inventory",
    storageBucket: "miguel-inventory.firebasestorage.app",
    messagingSenderId: "277968569414",
    appId: "1:277968569414:web:04884bc1932c2c7dbb6b647"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const emailAutorizado = "ulisses.dos.santos@gmail.com";

onAuthStateChanged(auth, (user) => {
    const path = window.location.pathname;
    
    // MELHORIA: Verifica se é a página inicial de forma mais segura para o GitHub
    // Isso evita que ele tente redirecionar quando você já está na capa
    const isIndex = path.endsWith("/") || path.endsWith("index.html") || path.endsWith("index");

    if (user) {
        if (user.email !== emailAutorizado) {
            alert("Acesso negado: " + user.email);
            signOut(auth).then(() => {
                window.location.assign("index.html"); // Usa assign para garantir o caminho correto
            });
        }
    } else {
        // Se não estiver logado e NÃO for a index, manda para a index.html
        if (!isIndex) {
            console.log("Acesso restrito. Redirecionando para a Home...");
            window.location.assign("index.html");
        }
    }
});
