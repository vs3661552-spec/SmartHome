// ======================================
// SMARTHOME - CONTROLE DA LÂMPADA
// ======================================

// Importações do Firebase
import { database, auth } from "./firebase.js";

import {
    ref,
    set,
    onValue
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-database.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";


// ======================================
// ELEMENTOS DO HTML
// ======================================

const telaLogin = document.getElementById("telaLogin");
const telaControle = document.getElementById("telaControle");

const formLogin = document.getElementById("formLogin");

const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");

const botaoLogin = document.getElementById("botaoLogin");
const botaoLampada = document.getElementById("botaoLampada");
const botaoSair = document.getElementById("botaoSair");

const mensagemLogin = document.getElementById("mensagemLogin");

const status = document.getElementById("status");
const icone = document.getElementById("iconeLampada");


// ======================================
// REFERÊNCIA DA LÂMPADA NO FIREBASE
// ======================================

const lampadaRef = ref(database, "lampada/estado");

let lampadaLigada = false;
let pararMonitoramento = null;


// ======================================
// ATUALIZAR A INTERFACE
// ======================================

function atualizarInterface(estado) {

    lampadaLigada = estado;

    if (estado) {

        status.textContent = "Lâmpada ligada";

        botaoLampada.textContent = "DESLIGAR LÂMPADA";

        icone.style.opacity = "1";

    } else {

        status.textContent = "Lâmpada desligada";

        botaoLampada.textContent = "LIGAR LÂMPADA";

        icone.style.opacity = "0.4";

    }
}


// ======================================
// LOGIN DO ADMINISTRADOR
// ======================================

formLogin.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const email = emailInput.value.trim();

    const senha = senhaInput.value;

    try {

        botaoLogin.disabled = true;

        botaoLogin.textContent = "ENTRANDO...";

        mensagemLogin.textContent = "Verificando acesso...";

        await signInWithEmailAndPassword(auth, email, senha);

        mensagemLogin.textContent = "Login realizado com sucesso!";

    } catch (erro) {

        console.error("Erro no login:", erro);

        mensagemLogin.textContent =
            "E-mail ou senha incorretos. Verifique seus dados.";

    } finally {

        botaoLogin.disabled = false;

        botaoLogin.textContent = "ENTRAR";

    }

});


// ======================================
// VERIFICAR AUTENTICAÇÃO
// ======================================

onAuthStateChanged(auth, (usuario) => {

    if (usuario) {

        // Usuário conectado
        telaLogin.hidden = true;

        telaControle.hidden = false;

        status.textContent = "Conectando ao Firebase...";

        // Evita criar vários monitoramentos
        if (pararMonitoramento) {
            pararMonitoramento();
        }

        pararMonitoramento = onValue(
            lampadaRef,

            (snapshot) => {

                atualizarInterface(snapshot.val() === true);

            },

            (erro) => {

                console.error("Erro ao consultar lâmpada:", erro);

                status.textContent = "Erro na conexão com Firebase";

            }
        );

    } else {

        // Usuário desconectado
        telaLogin.hidden = false;

        telaControle.hidden = true;

        if (pararMonitoramento) {

            pararMonitoramento();

            pararMonitoramento = null;

        }

    }

});


// ======================================
// BOTÃO DE CONTROLE DA LÂMPADA
// ======================================

botaoLampada.addEventListener("click", async () => {

    const novoEstado = !lampadaLigada;

    try {

        botaoLampada.disabled = true;

        await set(lampadaRef, novoEstado);

        console.log("Comando enviado ao Firebase:", novoEstado);

    } catch (erro) {

        console.error("Erro ao enviar comando:", erro);

        alert("Não foi possível controlar a lâmpada.");

    } finally {

        botaoLampada.disabled = false;

    }

});


// ======================================
// SAIR DA CONTA
// ======================================

botaoSair.addEventListener("click", async () => {

    try {

        await signOut(auth);

        console.log("Usuário desconectado.");

    } catch (erro) {

        console.error("Erro ao sair:", erro);

    }

});