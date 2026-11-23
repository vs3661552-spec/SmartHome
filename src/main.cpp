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

#define API_KEY "oML3IJFnzySRkWHzRIBXQzt9MXf2"

#define USER_EMAIL "vs3661552@gmail.com"
#define USER_PASSWORD "Gard1234@"

#define DATABASE_URL "https://smarthome-a8707-default-rtdb.firebaseio.com"

// =====================================
// CONFIGURACAO DO RELE
// =====================================

#define RELE1 25
#define RELE2 33

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

            bool estado = stream.to<bool>();

            if (estado == true) {

                digitalWrite(RELE1, LOW);

                Serial.println("LAMPADA LIGADA!");

            } else {

                digitalWrite(RELE2, HIGH);

                Serial.println("LAMPADA DESLIGADA!");

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

    // Mantem o rele desligado inicialmente
    digitalWrite(RELE1, LOW);
    digitalWrite(RELE2, LOW);

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

    // Escutar alteracoes da lampada

    Database.get(
        cliente,
        "/lampada/estado",
        processarDados,
        true,
        "monitorLampada"
    );

    Serial.println("Aguardando comandos do site...");

}

// =====================================
// LOOP PRINCIPAL
// =====================================

void loop() {

    app.loop();

}