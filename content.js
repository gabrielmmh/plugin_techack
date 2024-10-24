console.log("Content script injetado!");

// Função para detectar LocalStorage
function detectLocalStorage() {
    let localStorageKeys = Object.keys(localStorage);
    console.log(`LocalStorage contém ${localStorageKeys.length} chaves.`);

    browser.runtime.sendMessage({
        action: 'updateLocalStorage',
        localStorageCount: localStorageKeys.length
    }).catch((error) => console.error('Erro ao enviar localStorage:', error));
}

// Função para detectar SessionStorage
function detectSessionStorage() {
    let sessionStorageKeys = Object.keys(sessionStorage);
    console.log(`SessionStorage contém ${sessionStorageKeys.length} chaves.`);
}

// Detecta fingerprinting
function monitorCanvasFingerprinting() {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

    let fingerprintingDetected = false;

    // Sobrescreve o método toDataURL
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
        fingerprintingDetected = true;
        notifyFingerprintingDetected(); // Notifica o usuário
        console.log('Fingerprinting detectado: toDataURL chamado');
        return originalToDataURL.apply(this, args); // Executa o método original
    };

    // Sobrescreve o método getImageData
    CanvasRenderingContext2D.prototype.getImageData = function (...args) {
        fingerprintingDetected = true;
        notifyFingerprintingDetected(); // Notifica o usuário
        console.log('Fingerprinting detectado: getImageData chamado');
        return originalGetImageData.apply(this, args); // Executa o método original
    };

    // Função para notificar sobre fingerprinting
    function notifyFingerprintingDetected() {
        if (!fingerprintingDetected) {
            browser.runtime.sendMessage({
                action: 'fingerprintingDetected',
                message: 'Fingerprinting detectado!'
            }).catch((error) => console.error('Erro ao enviar fingerprinting:', error));
        }
    }
}

// Função para enviar mensagem ao background e obter os cookies
function detectCookies() {
    browser.runtime.sendMessage({ action: 'getCookies' }).then((response) => {
        console.log(`Cookies de Primeira Parte: ${response.firstParty}`);
        console.log(`Cookies de Terceira Parte: ${response.thirdParty}`);
        console.log(`Cookies de Sessão: ${response.session}`);
        console.log(`Cookies Persistentes: ${response.persistent}`);

        // Envia os dados para o popup
        browser.runtime.sendMessage({
            action: 'updateCookies',
            ...response
        });
    }).catch((error) => {
        console.error('Erro ao obter cookies:', error);
    });
}

// Função para detectar tentativa de hijacking
function detectHijacking() {
    const homepage = browser.storage.local.get('homepage');
    homepage.then(result => {
        if (result.homepage && result.homepage !== window.location.href) {
            console.warn("Possível tentativa de hijacking detectada.");
            browser.runtime.sendMessage({
                action: 'hijackingDetected',
                message: 'Tentativa de hijacking detectada!'
            });
        }
    });

    browser.storage.local.set({ homepage: window.location.href });
}

// Chamar todas as funções
detectSessionStorage();
detectCookies();

browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'collectData') {
        console.log("Coletando dados para o popup...");

        // Detecta LocalStorage
        detectLocalStorage();
        monitorCanvasFingerprinting();
        detectHijacking();
    }
});