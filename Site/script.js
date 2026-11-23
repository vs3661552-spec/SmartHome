// ======================================
// SMARTHOME - CONTROLE DE 2 LÂMPADAS
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
const botaoSair = document.getElementById("botaoSair");
const mensagemLogin = document.getElementById("mensagemLogin");

// ======================================
// LÂMPADAS (cada uma é um nó em /lampadas/<id>)
// ======================================

const lampadas = [...document.querySelectorAll(".lampadaItem")].map((el) => {

    const id = el.dataset.lampada;   // "lampada1", "lampada2"
    const numero = id.replace("lampada", "");

    return {
        id,
        numero,
        ref: ref(database, `lampadas/${id}`),
        ligada: false,
        parar: null,
        status: el.querySelector(".status"),
        icone: el.querySelector(".lampada"),
        botao: el.querySelector(".botaoLampada")
    };
});


// ======================================
// ATUALIZAR A INTERFACE
// ======================================

function atualizarInterface(lampada, estado) {

    lampada.ligada = estado;

    lampada.status.textContent =
        `Lâmpada ${lampada.numero} ${estado ? "ligada" : "desligada"}`;

    lampada.botao.textContent =
        `${estado ? "DESLIGAR" : "LIGAR"} LÂMPADA ${lampada.numero}`;

    lampada.icone.style.opacity = estado ? "1" : "0.4";
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

function pararMonitoramentos() {

    lampadas.forEach((lampada) => {

        if (lampada.parar) {

            lampada.parar();

            lampada.parar = null;
        }
    });
}

onAuthStateChanged(auth, (usuario) => {

    // Evita criar vários monitoramentos
    pararMonitoramentos();

    if (usuario) {

        telaLogin.hidden = true;

        telaControle.hidden = false;

        lampadas.forEach((lampada) => {

            lampada.status.textContent = "Conectando ao Firebase...";

            lampada.parar = onValue(
                lampada.ref,

                (snapshot) => {

                    atualizarInterface(lampada, snapshot.val() === true);

                },

                (erro) => {

                    console.error(`Erro ao consultar ${lampada.id}:`, erro);

                    lampada.status.textContent = "Erro na conexão com Firebase";

                }
            );
        });

    } else {

        telaLogin.hidden = false;

        telaControle.hidden = true;
    }

});


// ======================================
// BOTÃO DE CONTROLE DA LÂMPADA
// ======================================

lampadas.forEach((lampada) => {

    lampada.botao.addEventListener("click", async () => {

        const novoEstado = !lampada.ligada;

        try {

            lampada.botao.disabled = true;

            await set(lampada.ref, novoEstado);

            console.log(`Comando enviado (${lampada.id}):`, novoEstado);

        } catch (erro) {

            console.error("Erro ao enviar comando:", erro);

            alert(`Não foi possível controlar a lâmpada ${lampada.numero}.`);

        } finally {

            lampada.botao.disabled = false;

        }

    });
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