const thirdPartyConnections = [];

// Monitorando conexões com domínios de terceiros
browser.webRequest.onCompleted.addListener(
    (details) => {
        const pageHostname = location.hostname;
        const connectionHostname = new URL(details.url).hostname;

        if (connectionHostname !== pageHostname) {
            console.log(`Conexão detectada: ${details.url}`);
            thirdPartyConnections.push(details.url); // Armazena a URL
        }
    },
    { urls: ["<all_urls>"] }
);

// Listener para lidar com todas as mensagens recebidas
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getThirdPartyConnections') {
        sendResponse({ connections: thirdPartyConnections });
        return true;
    }

    if (message.action === 'getCookies') {
        // Coleta de cookies e classificação
        browser.cookies.getAll({}).then((cookies) => {
            const firstPartyCookies = [];
            const thirdPartyCookies = [];
            const sessionCookies = [];
            const persistentCookies = [];

            cookies.forEach(cookie => {
                if (cookie.firstPartyIsolate) {
                    thirdPartyCookies.push(cookie);
                } else {
                    firstPartyCookies.push(cookie);
                }
                if (cookie.session) {
                    sessionCookies.push(cookie);
                } else {
                    persistentCookies.push(cookie);
                }
            });

            // Envia a resposta com os cookies detalhados
            sendResponse({
                firstPartyCookies,
                thirdPartyCookies,
                sessionCookies,
                persistentCookies
            });
        }).catch(error => {
            console.error('Erro ao obter cookies:', error);
            sendResponse({ error: 'Erro ao obter cookies' });
        });

        return true; // Indica que a resposta é assíncrona
    }

    if (message.action === 'getData') {
        // Simula a coleta de dados do localStorage
        sendResponse({
            cookies: "Não aplicável no background",
            localStorage: "Dados do localStorage precisam ser coletados no content script"
        });

        return true;
    }
});
