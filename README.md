# SmartHome

Controle de **2 lâmpadas** (2 relés) via internet. Um site web (com login) envia comandos ao **Firebase Realtime Database**, e um **ESP32** conectado ao Wi-Fi escuta o banco em tempo real e aciona um módulo relé que liga/desliga a lâmpada.

```
 ┌──────────────┐   set(true/false)    ┌───────────────────────────┐   stream (SSE)   ┌─────────┐   GPIO   ┌───────┐
 │  Site (web)  │ ───────────────────► │ Firebase Realtime Database│ ───────────────► │  ESP32  │ ───────► │ Relés │
 │ login + botão│ ◄─────────────────── │       /lampadas           │                  │         │          │Lâmp. │
 └──────────────┘   onValue (estado)   └───────────────────────────┘                  └─────────┘          └───────┘
          └────────── Firebase Auth (e-mail/senha) ──────────┘  └──── Firebase Auth (e-mail/senha) ────┘
```

## Estrutura do repositório

| Caminho | Descrição |
|---|---|
| [src/main.cpp](src/main.cpp) | Firmware do ESP32 (Arduino framework): Wi-Fi, autenticação no Firebase, escuta do estado da lâmpada e acionamento dos relés. |
| [platformio.ini](platformio.ini) | Configuração do PlatformIO (placa `esp32dev`, 115200 baud, dependência `mobizt/FirebaseClient`). |
| [Site/index.html](Site/index.html) | Interface: tela de login e tela de controle da lâmpada. |
| [Site/style.css](Site/style.css) | Estilos da interface. |
| [Site/firebase.js](Site/firebase.js) | Inicialização do Firebase no navegador (app, Database e Auth). |
| [Site/script.js](Site/script.js) | Lógica do site: login/logout, leitura em tempo real e envio de comandos. |
| `include/`, `lib/`, `test/` | Pastas padrão do PlatformIO (apenas READMEs). |

## Comunicação com o Firebase

Todo o sistema gira em torno do nó `/lampadas` do Realtime Database (uma chave booleana por lâmpada/relé):

```
/lampadas
   ├── lampada1 : true | false
   └── lampada2 : true | false
```

- `true` → lâmpada ligada
- `false` → lâmpada desligada

O site **escreve** nesse nó; o ESP32 **escuta** esse nó. O Firebase faz o papel de intermediário, então os dois lados não precisam se conhecer nem estar na mesma rede.

### Autenticação

Tanto o site quanto o ESP32 usam **Firebase Authentication (e-mail e senha)**. Só quem está autenticado deve conseguir ler/escrever no banco (controlado pelas *Rules* do Realtime Database no console do Firebase).

- **Site** — [Site/script.js](Site/script.js): `signInWithEmailAndPassword(auth, email, senha)` no envio do formulário. `onAuthStateChanged` alterna entre a tela de login e a tela de controle e, ao logar, inicia o monitoramento do banco. O botão "Sair" chama `signOut`.
- **ESP32** — [src/main.cpp](src/main.cpp): usa a biblioteca `FirebaseClient` com `UserAuth(API_KEY, USER_EMAIL, USER_PASSWORD)` e `initializeApp(...)`, logando como um usuário de serviço.

### Lado do site (cliente web)

Configuração em [Site/firebase.js](Site/firebase.js): `initializeApp(firebaseConfig)` e exporta `database` (`getDatabase`) e `auth` (`getAuth`), carregados via CDN (`gstatic.com/firebasejs`).

Em [Site/script.js](Site/script.js), `lampada.ref = ref(database, "lampadas/lampadaN")`:

1. **Leitura em tempo real** — `onValue(...)` em cada lâmpada é chamado a cada mudança do valor e atualiza texto, botão e ícone (`atualizarInterface`). Isso mantém vários dispositivos sincronizados.
2. **Envio de comando** — ao clicar no botão, `set(lampada.ref, !lampada.ligada)` grava o novo estado no banco.

### Lado do ESP32 (firmware)

Em [src/main.cpp](src/main.cpp):

1. Conecta ao Wi-Fi (`WiFi.begin`).
2. Usa `WiFiClientSecure` (HTTPS) com `setInsecure()` — **não valida o certificado**, adequado só para testes.
3. Autentica (`initializeApp` + `UserAuth`) e obtém a instância `RealtimeDatabase` apontando para `DATABASE_URL`.
4. Abre um **stream** em `/lampadas`:
   `Database.get(cliente, "/lampadas", processarDados, true, "monitorLampadas")` — o parâmetro `true` ativa o modo SSE (Server-Sent Events), de modo que o Firebase envia o valor sempre que ele muda, sem polling.
5. `processarDados` (callback assíncrono) lê o booleano recebido e aciona o relé correspondente. O stream em `/lampadas` entrega o JSON completo no início (caminho `/`) e depois apenas a lâmpada alterada (`/lampada1` ou `/lampada2`). Se o relé funcionar invertido, ajuste `RELE_ATIVO_EM_NIVEL_BAIXO`.
6. `loop()` apenas chama `app.loop()`, que mantém autenticação, conexão e callbacks funcionando.

### Fluxo completo de um comando

1. Usuário faz login no site (Firebase Auth).
2. Clica em **LIGAR LÂMPADA** → `set("lampadas/lampada1", true)`.
3. O Firebase persiste o valor e notifica os ouvintes: o próprio site (`onValue`) e o ESP32 (stream).
4. O ESP32 recebe `true`, aciona o relé e imprime `LAMPADA LIGADA!` na serial.

## Hardware

- ESP32 DevKit (`esp32dev`)
- Módulo relé (pinos `RELE1 = 25`, `RELE2 = 33`)
- Lâmpada e fonte adequadas (**cuidado com a rede elétrica**)

## Como executar

### Firmware (PlatformIO)

1. Instale o PlatformIO (extensão do VS Code).
2. Ajuste `upload_port` / `monitor_port` em [platformio.ini](platformio.ini) para a porta da sua máquina (atualmente `COM8`).
3. Configure em [src/main.cpp](src/main.cpp): `WIFI_SSID`, `WIFI_PASSWORD`, `API_KEY`, `USER_EMAIL`, `USER_PASSWORD` e `DATABASE_URL`.
4. Compile e envie: `pio run -t upload`; acompanhe com `pio device monitor`.

### Site

Os módulos ES (`import`) exigem servidor HTTP — não abra o `index.html` direto pelo disco:

```bash
cd Site
python3 -m http.server 8000
# acesse http://localhost:8000
```

Pré-requisitos no console do Firebase: habilitar **Authentication → E-mail/senha**, criar os usuários e definir as *Rules* do Realtime Database para permitir acesso apenas a usuários autenticados, por exemplo:

```json
{
  "rules": {
    "lampadas": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## Pontos de atenção

- **Credenciais no código**: [src/main.cpp](src/main.cpp) contém senha de Wi-Fi, e-mail e senha do usuário Firebase em texto puro e está versionado. Considere trocá-las, removê-las do histórico e movê-las para um arquivo ignorado pelo git (ex.: `secrets.h` no `.gitignore`). A `apiKey` do `firebaseConfig` do site é pública por natureza; a segurança vem das *Rules* e do Auth.
- `setInsecure()` desativa a validação TLS; para produção, use o certificado raiz.
