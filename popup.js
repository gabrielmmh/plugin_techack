document.addEventListener('DOMContentLoaded', () => {
    let baseScore = 100; // Pontuação inicial fixa
    let currentScore = baseScore; // Pontuação que será modificada
    let penalizedCookies = false;
    let penalizedFingerprint = false;
    let penalizedHijacking = false;
    let isExpanded = false; // Controle do estado de exibição

    const connectionList = document.getElementById('connectionList');
    const toggleButton = document.getElementById('toggleButton');
    const connectionsCount = document.getElementById('connectionsCount');
    const firstPartyCookiesCount = document.getElementById('firstPartyCookiesCount');
    const thirdPartyCookiesCount = document.getElementById('thirdPartyCookiesCount');
    const sessionCookiesCount = document.getElementById('sessionCookiesCount');
    const persistentCookiesCount = document.getElementById('persistentCookiesCount');

    // Função para alternar exibição de cookies
    function toggleList(list) {
        list.classList.toggle('hidden');
    }

    // Configurar eventos de alternância
    document.getElementById('firstPartyToggle').addEventListener('click', () => toggleList(document.getElementById('firstPartyCookiesList')));
    document.getElementById('thirdPartyToggle').addEventListener('click', () => toggleList(document.getElementById('thirdPartyCookiesList')));
    document.getElementById('sessionToggle').addEventListener('click', () => toggleList(document.getElementById('sessionCookiesList')));
    document.getElementById('persistentToggle').addEventListener('click', () => toggleList(document.getElementById('persistentCookiesList')));

    // Função para exibir cookies
    function populateCookieList(cookies, listElement, countElement) {
        listElement.innerHTML = '';
        cookies.forEach(cookie => {
            const li = document.createElement('li');
            li.textContent = `${cookie.name}: ${cookie.value}`;
            listElement.appendChild(li);
        });
        countElement.innerText = `(${cookies.length})`;
    }

    // Função genérica para timeout
    function setLoadingTimeout(elementId, onTimeout, timeout = 5000) {
        setTimeout(() => {
            const element = document.getElementById(elementId);
            if (element.innerText.includes("Verificando...")) {
                element.innerText = "Não encontrado!";
                onTimeout(); // Executa a lógica de pontuação específica
            }
        }, timeout);
    }

    // Função para atualizar a contagem de conexões
    function updateConnectionsCount(count) {
        connectionsCount.innerText = `(${count})`;
    }

    // Função para exibir as conexões
    function displayConnections(connections) {
        connectionList.innerHTML = ''; // Limpa a lista
        connectionList.classList.remove('hidden'); // Garante que a lista esteja visível

        const connectionsToShow = isExpanded ? connections : connections.slice(0, 5);
        connectionsToShow.forEach((url) => {
            const li = document.createElement('li');
            li.textContent = url;
            connectionList.appendChild(li);
        });

        toggleButton.innerText = isExpanded ? 'Ver Menos' : 'Ver Mais';
    }

    // Função para solicitar e atualizar os dados periodicamente
    function updateData() {
        browser.runtime.sendMessage({ action: 'getThirdPartyConnections' }).then((response) => {
            displayConnections(response.connections);
            updateConnectionsCount(response.connections.length);
        }).catch((error) => {
            console.error('Erro ao carregar conexões:', error);
        });

        browser.runtime.sendMessage({ action: 'getCookies' }).then((response) => {
            if (response.error) {
                console.error(response.error);
                return;
            }

            populateCookieList(response.firstPartyCookies, document.getElementById('firstPartyCookiesList'), firstPartyCookiesCount);
            populateCookieList(response.thirdPartyCookies, document.getElementById('thirdPartyCookiesList'), thirdPartyCookiesCount);
            populateCookieList(response.sessionCookies, document.getElementById('sessionCookiesList'), sessionCookiesCount);
            populateCookieList(response.persistentCookies, document.getElementById('persistentCookiesList'), persistentCookiesCount);

            if (!penalizedCookies && response.thirdPartyCookies.length > 0) {
                currentScore -= response.thirdPartyCookies.length * 2;
                penalizedCookies = true;
            }

        }).catch((error) => {
            console.error('Erro ao carregar cookies:', error);
        });

        browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            browser.tabs.sendMessage(tabs[0].id, { action: 'collectData' });
        });
    }

    // Função para atualizar a pontuação e a cor
    function updateScore() {
        const scoreElement = document.getElementById('score');
        scoreElement.innerText = `${Math.max(currentScore, 0)}/100`;

        // Define a cor da pontuação com base no valor
        scoreElement.classList.remove('good', 'medium', 'low');
        if (currentScore >= 80) {
            scoreElement.classList.add('good'); // Verde
        } else if (currentScore >= 50) {
            scoreElement.classList.add('medium'); // Laranja
        } else {
            scoreElement.classList.add('low'); // Vermelho
        }

        updateScoreDescription(); // Atualiza a descrição
    }

    // Função para atualizar a descrição da pontuação
    function updateScoreDescription() {
        const descriptionElement = document.getElementById('scoreDescription');
        if (currentScore >= 80) {
            descriptionElement.innerText = "Excelente privacidade! Poucas ameaças detectadas.";
        } else if (currentScore >= 50) {
            descriptionElement.innerText = "Privacidade média. Algumas ameaças foram encontradas.";
        } else {
            descriptionElement.innerText = "Baixa privacidade. Muitas ameaças detectadas!";
        }
    }

    // Evento de alternância para conexões
    toggleButton.addEventListener('click', () => {
        isExpanded = !isExpanded;
        updateData();
    });

    // Listener para mensagens do content.js
    browser.runtime.onMessage.addListener((message) => {
        if (message.action === 'updateLocalStorage') {
            document.getElementById('localStorage').innerText = `LocalStorage: ${message.localStorageCount} chaves`;
        }

        if (message.action === 'fingerprintingDetected' && !penalizedFingerprint) {
            document.getElementById('fingerprinting').innerText = message.message;
            currentScore -= 20;
            penalizedFingerprint = true;
            updateScore();
        }

        if (message.action === 'hijackingDetected' && !penalizedHijacking) {
            document.getElementById('hijacking').innerText = message.message;
            currentScore -= 30;
            penalizedHijacking = true;
            updateScore();
        }
    });

    // Definição de timeout para fingerprinting e hijacking
    setLoadingTimeout('fingerprinting', () => {
        if (!penalizedFingerprint) {
            currentScore -= 20;
            penalizedFingerprint = true;
        }
    });

    setLoadingTimeout('hijacking', () => {
        if (!penalizedHijacking) {
            currentScore -= 30;
            penalizedHijacking = true;
            updateScore();
        }
    });

    updateData();
    setInterval(updateData, 2000); // Atualiza automaticamente a cada 2 segundos
});
