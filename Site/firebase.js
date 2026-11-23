// Importa as funções do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";

import {
    getDatabase
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-database.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

// Configurações do projeto
const firebaseConfig = {
    apiKey: "AIzaSyCWtKMLZDq6-nuEL-2xoXJcQc2OeUIN52w",
    authDomain: "smarthome-a8707.firebaseapp.com",
    databaseURL: "https://smarthome-a8707-default-rtdb.firebaseio.com",
    projectId: "smarthome-a8707",
    storageBucket: "smarthome-a8707.firebasestorage.app",
    messagingSenderId: "26334434176",
    appId: "1:26334434176:web:cf7adf6f688d1c1b086765"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o banco de dados
const database = getDatabase(app);

// Inicializa a autenticação
const auth = getAuth(app);

// Exporta as conexões
export { database, auth };