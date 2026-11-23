#define ENABLE_USER_AUTH
#define ENABLE_DATABASE

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <FirebaseClient.h>

// =====================================
// DADOS DO WIFI
// =====================================

#define WIFI_SSID "IFPI_Visitante"
#define WIFI_PASSWORD "bwUXNdpft0mR9f"

// =====================================
// DADOS DO FIREBASE
// =====================================

#define API_KEY "AIzaSyCWtKMLZDq6-nuEL-2xoXJcQc2OeUIN52w"

#define USER_EMAIL "vs3661552@gmail.com"
#define USER_PASSWORD "Gard1234@"

#define DATABASE_URL "https://smarthome-a8707-default-rtdb.firebaseio.com"

// =====================================
// CONFIGURACAO DO RELE
// =====================================

#define RELE1 25
#define RELE2 33

// Muitos modulos de rele sao ativados com nivel BAIXO.
// Se a lampada acender invertida, troque para true/false.
#define RELE_ATIVO_EM_NIVEL_BAIXO false

const int PINOS_RELE[2] = {RELE1, RELE2};

void acionarRele(int indice, bool ligado) {

    bool nivel = RELE_ATIVO_EM_NIVEL_BAIXO ? !ligado : ligado;

    digitalWrite(PINOS_RELE[indice], nivel ? HIGH : LOW);

    Serial.print("LAMPADA ");
    Serial.print(indice + 1);
    Serial.println(ligado ? " LIGADA!" : " DESLIGADA!");
}

// Procura "lampadaN":true/false em um JSON simples.
// Retorna 1 (true), 0 (false) ou -1 (nao encontrado).
int lerEstadoJson(const String &json, int numero) {

    String chave = "\"lampada" + String(numero) + "\":";
    int pos = json.indexOf(chave);

    if (pos < 0) return -1;

    pos += chave.length();

    return json.startsWith("true", pos) ? 1 : 0;
}

// =====================================
// FIREBASE
// =====================================

WiFiClientSecure ssl_client;

using AsyncClient = AsyncClientClass;

AsyncClient cliente(ssl_client);

UserAuth usuario(
    API_KEY,
    USER_EMAIL,
    USER_PASSWORD
);

FirebaseApp app;

RealtimeDatabase Database;

// =====================================
// FUNCAO PARA RECEBER DADOS
// =====================================

void processarDados(AsyncResult &resultado) {

    if (!resultado.isResult()) {
        return;
    }

    if (resultado.isError()) {

        Serial.print("Erro Firebase: ");
        Serial.println(resultado.error().message());

    }

    if (resultado.available()) {

        RealtimeDatabaseResult &stream =
            resultado.to<RealtimeDatabaseResult>();

        if (stream.isStream()) {

            // O stream escuta o no "/lampadas". Dois tipos de evento:
            //  - caminho "/"          -> JSON com todas as lampadas (evento inicial)
            //  - caminho "/lampadaN"  -> valor booleano de uma lampada
            String caminho = stream.dataPath();

            if (caminho == "/") {

                String json = stream.to<String>();

                for (int i = 0; i < 2; i++) {

                    int estado = lerEstadoJson(json, i + 1);

                    if (estado >= 0) acionarRele(i, estado == 1);
                }

            } else if (caminho == "/lampada1") {

                acionarRele(0, stream.to<bool>());

            } else if (caminho == "/lampada2") {

                acionarRele(1, stream.to<bool>());
            }
        }
    }
}

// =====================================
// CONFIGURACAO INICIAL
// =====================================

void setup() {

    Serial.begin(115200);

    pinMode(RELE1, OUTPUT);
    pinMode(RELE2, OUTPUT);

    // Mantem os reles desligados inicialmente
    acionarRele(0, false);
    acionarRele(1, false);

    Serial.println();
    Serial.println("================================");
    Serial.println("       SMARTHOME INICIADO");
    Serial.println("================================");

    // Conectar ao Wi-Fi

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    Serial.print("Conectando ao Wi-Fi");

    while (WiFi.status() != WL_CONNECTED) {

        Serial.print(".");
        delay(500);

    }

    Serial.println();
    Serial.println("Wi-Fi conectado!");

    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

    // Configuracao HTTPS
    // Apenas para teste inicial.
    // Nao valida o certificado do servidor.

    ssl_client.setInsecure();

    // Inicializar Firebase

    Serial.println("Conectando ao Firebase...");

    initializeApp(
        cliente,
        app,
        getAuth(usuario)
    );

    app.getApp<RealtimeDatabase>(Database);

    Database.url(DATABASE_URL);

    Serial.println("Firebase configurado!");

    // Escutar alteracoes das lampadas (/lampadas/lampada1 e /lampadas/lampada2)

    Database.get(
        cliente,
        "/lampadas",
        processarDados,
        true,
        "monitorLampadas"
    );

    Serial.println("Aguardando comandos do site...");

}

// =====================================
// LOOP PRINCIPAL
// =====================================

void loop() {

    app.loop();

}