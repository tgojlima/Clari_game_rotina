// Inicialização do Jogo e Elementos da UI
document.addEventListener('DOMContentLoaded', () => {
    
    // === CONFIGURAÇÃO DO FIREBASE ===
    const firebaseConfig = {
        apiKey: "SUA_API_KEY",
        authDomain: "seu-projeto.firebaseapp.com",
        projectId: "seu-projeto",
        storageBucket: "seu-projeto.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123:web:456"
    };
    
    let db, auth;
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
    } catch(e) {
        console.warn("Firebase rodando modo local.");
    }

    const loginScreen = document.getElementById('login-screen');
    const loginBtn = document.getElementById('login-btn');
    const loginMsg = document.getElementById('login-msg');
    const gameContainer = document.getElementById('game-container');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    const dialogBox = document.getElementById('dialog-box');
    const dialogPortrait = document.getElementById('dialog-portrait');
    const dialogName = document.getElementById('dialog-name');
    const dialogText = document.getElementById('dialog-text');
    const dialogNextBtn = document.getElementById('dialog-next');
    const dialogYesBtn = document.getElementById('dialog-btn-yes');
    const scoreDisplay = document.getElementById('score');

    const portraits = {
        'Mãe': 'assets/avatares/Mãe.jpeg',
        'Pai': 'assets/avatares/Pai.jpeg',
        'Avó': 'assets/avatares/Avó.jpeg',
        'Clarice': 'assets/avatares/Clari.jpeg',
        'Anya': 'assets/personagens/Anya_spy_family.jpeg',
        'Alegria': 'assets/personagens/Alegria_divertidamente.jpeg',
        'Príncipe': 'assets/personagens/Principe.jpg'
    };

    const brazilHolidays = {
        '01-01': 'Ano Novo',
        '04-21': 'Tiradentes',
        '05-01': 'Dia do Trabalhador',
        '09-07': 'Independência do Brasil',
        '10-12': 'Dia das Crianças',
        '10-15': 'Dia do Professor',
        '11-02': 'Finados',
        '11-15': 'Proclamação da República',
        '11-20': 'Consciência Negra',
        '12-25': 'Natal'
    };

    let state = {
        score: 0,
        currentHelper: 'Anya',
        user: null,
        pendingTaskPoints: 0,
        completedTasks: [],
        goals: [
            { id: 'fixed_book', name: 'Livro de História', points: 50, done: false, fixed: true },
            { id: Date.now(), name: 'Ir ao parque', points: 100, done: false }
        ],
        alarms: [
            { id: Date.now()+1, time: '06:30', label: 'Acordar' },
            { id: Date.now()+2, time: '12:30', label: 'Ir para Escola' },
            { id: Date.now()+3, time: '23:30', label: 'Dormir (Máximo)' }
        ],
        customTasks: [],
        specialRequestText: 'Fazer atividade extra',
        customDates: [],
        lastWeeklySummary: null
    };

    // === SISTEMA DE SALVAMENTO (FIREBASE + LOCALSTORAGE) ===
    function saveGame() {
        if (!state.user) return;
        const dataStr = JSON.stringify(state);
        localStorage.setItem('clari_save_' + state.user, dataStr); // Backup Offline
        
        if (db) { // Sincronização Online (Se configurado)
            db.collection('saves').doc(state.user).set({ savedData: dataStr })
              .catch(e => console.warn("Modo offline: salvo apenas localmente."));
        }
    }

    function loadGame(email, callback) {
        if (db) {
            db.collection('saves').doc(email).get().then(doc => {
                if(doc.exists && doc.data().savedData) {
                    Object.assign(state, JSON.parse(doc.data().savedData));
                } else {
                    loadLocal(email);
                }
                callback();
            }).catch(e => { loadLocal(email); callback(); });
        } else {
            loadLocal(email); callback();
        }
    }

    function loadLocal(email) {
        const local = localStorage.getItem('clari_save_' + email);
        if (local) {
            Object.assign(state, JSON.parse(local));
        }
    }

    // === SISTEMA DE ÁUDIO MAGICO ===
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playTone(freq, type, duration, vol=0.1) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    }
    window.playCoin = () => { playTone(987.77, 'sine', 0.1, 0.2); setTimeout(() => playTone(1318.51, 'sine', 0.2, 0.2), 100); };
    window.playTada = () => { playTone(523.25, 'triangle', 0.2); setTimeout(() => playTone(659.25, 'triangle', 0.2), 150); setTimeout(() => playTone(783.99, 'triangle', 0.4), 300); };
    window.playMeow = () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    };

    window.playBlip = () => {
        playTone(400, 'sine', 0.05, 0.05);
        setTimeout(() => playTone(500, 'sine', 0.05, 0.05), 60);
    };

    window.playAlarmSound = () => {
        for(let i = 0; i < 5; i++) {
            setTimeout(() => playTone(800, 'square', 0.15, 0.2), i * 600);
            setTimeout(() => playTone(1200, 'square', 0.15, 0.2), i * 600 + 200);
        }
    };

    // === MÚSICA DE FUNDO ===
    const bgmAudio = document.getElementById('bgm-audio');
    bgmAudio.volume = 0.6;
    let musicPlaying = false;
    let currentBGM = '';

    // Links para os arquivos locais (baixe e coloque na pasta assets)
    const bgmTracks = {
        'room': 'assets/bgm_casa.mp3', 
        'city': 'assets/bgm_cidade.mp3', 
        'school': 'assets/bgm_escola.mp3', 
        'church': 'assets/bgm_igreja.mp3', 
        'firestation': 'assets/bgm_bombeiro.mp3'
    };

    window.updateBGM = () => {
        if (!musicPlaying) return;
        const targetTrack = bgmTracks[currentMapName] || bgmTracks['room'];
        if (currentBGM !== targetTrack) {
            currentBGM = targetTrack;
            bgmAudio.src = targetTrack;
            bgmAudio.load(); // Força o recarregamento do arquivo
            bgmAudio.play().catch(e => {
                console.error("Erro no áudio:", e);
                // Avisa o usuário se o arquivo não for encontrado (provavelmente nome errado)
                if(e.message.includes("Supported format") || e.message.includes("fetch") || e.name === "NotSupportedError") {
                    alert(`O jogo não conseguiu encontrar o arquivo "${targetTrack}". Verifique se o nome não ficou com .mp3.mp3 duplo!`);
                }
            });
        }
    };

    document.getElementById('btn-music').addEventListener('click', () => {
        if(musicPlaying) { 
            bgmAudio.pause(); 
            musicPlaying = false; 
            document.getElementById('btn-music').textContent = '🔇 Música'; 
        } else { 
            musicPlaying = true; 
            document.getElementById('btn-music').textContent = '🔊 Música'; 
            currentBGM = ''; // Força o recarregamento da música do mapa atual
            updateBGM();
        }
    });

    // === VERIFICADOR DE ALARMES ===
    let lastTriggeredAlarmTime = "";
    setInterval(() => {
        if (!state.user) return; // Só roda se estiver logado
        
        const now = new Date();
        const hhmm = now.toTimeString().substring(0,5);
        
        // Atualizar relógio do HUD
        const hudClock = document.getElementById('hud-clock');
        if (hudClock) hudClock.textContent = now.toLocaleDateString('pt-BR') + ' ' + hhmm;

        // Verificar alarmes
        let activeAlarm = state.alarms.find(a => a.time === hhmm);
        if (activeAlarm && lastTriggeredAlarmTime !== hhmm) {
            lastTriggeredAlarmTime = hhmm;
            triggerAlarm(activeAlarm.label);
        }
    }, 10000); // Verifica a cada 10 segundos

    function triggerAlarm(label) {
        playAlarmSound();
        document.body.classList.add('shake-active');
        setTimeout(() => document.body.classList.remove('shake-active'), 3000);
        showDialog('ALERTA', `⏰ HORA DO ALARME: ${label}!`, 0, null, 'Entendi!');
    }

    let lastAnyaReminder = Date.now();

    const mapObjects = {
        'room': [
            { id: 2, name: 'Cama da Clarice' },
            { id: 17, name: 'Pia do Banheiro' },
            { id: 18, name: 'Banheira' },
            { id: 28, name: 'Armário Banheiro' },
            { id: 31, name: 'Lixo Cozinha' },
            { id: 32, name: 'Ursinhos' },
            { id: 33, name: 'Janela do Quarto' },
            { id: 34, name: 'Caixa de Brinquedos' },
            { id: 35, name: 'Armário Pais' },
            { id: 36, name: 'Tapete Sala' },
            { id: 37, name: 'Sofá da Esquerda' },
            { id: 38, name: 'Mesa de Centro' },
            { id: 29, name: 'TV' },
            { id: 39, name: 'Pia Cozinha' },
            { id: 40, name: 'Comida Animais' },
            { id: 30, name: 'Mesa Cozinha' },
            { id: 41, name: 'Varanda Gato' },
            // NOVOS ESPAÇOS LIVRES (Só aparecem se tiver atividade)
            { id: 44, name: 'Geladeira (Espaço Livre)' },
            { id: 45, name: 'Pia da Área de Serviço (Espaço Livre)' },
            { id: 46, name: 'Vasos de Planta (Espaço Livre)' },
            { id: 47, name: 'Estante da Sala (Espaço Livre)' },
            { id: 48, name: 'Guarda-Roupa da Clarice (Espaço Livre)' },
            { id: 49, name: 'Fogão / Bancada (Espaço Livre)' },
            { id: 50, name: 'Máquina de Lavar (Espaço Livre)' },
            { id: 51, name: 'Sofá da Direita (Espaço Livre)' },
            { id: 52, name: 'Canto do Banheiro (Espaço Livre)' },
            { id: 53, name: 'Canto Quarto dos Pais (Espaço Livre)' }
        ],
        'school': [
            { id: 11, name: 'Mesa de Estudo' },
            { id: 21, name: 'Lição de Casa' }
        ],
        'church': [
            { id: 13, name: 'Bancos do Culto' },
            { id: 22, name: 'Decorar Versículo' },
            { id: 23, name: 'Atividade Kids' }
        ],
        'firestation': [
            { id: 24, name: 'Instrutor' },
            { id: 25, name: 'Live' },
            { id: 26, name: 'Armários/Desafio' }
        ]
    };

    function updateScore(points) {
        state.score += points;
        scoreDisplay.textContent = state.score;
        document.getElementById('dex-pts-hoje').textContent = state.score;
        document.getElementById('dex-pts-semana').textContent = state.score;
    }

    // === GERENCIAMENTO DE IMAGENS ===
    function loadImage(src, callback) {
        const img = new Image();
        img.onload = () => callback(img);
        img.onerror = () => console.warn("Erro ao carregar:", src);
        img.src = src;
    }

    let clariSprite = null, anyaSprite = null, maeSprite = null, paiSprite = null, avoSprite = null, catSprite = null;
    let bgRoom = null, bgCity = null, bgSchool = null, bgChurch = null, bgFirestation = null;

    loadImage('assets/personagens/Clari_Spritesheet-removebg-preview.png', (img) => clariSprite = img);
    loadImage('assets/personagens/Anya_Spritesheet-removebg-preview.png', (img) => anyaSprite = img);
    loadImage('assets/personagens/Mãe_Spritesheet-removebg-preview.png', (img) => maeSprite = img);
    loadImage('assets/personagens/Pai_Spritesheet-removebg-preview.png', (img) => paiSprite = img);
    loadImage('assets/personagens/Avó_Spritesheet-removebg-preview.png', (img) => avoSprite = img);
    loadImage('assets/personagens/Principe.jpg', (img) => catSprite = img);

    loadImage('assets/cenarios/canário_apartamento_interno.jpg', (img) => bgRoom = img);
    loadImage('assets/cenarios/cenário_externo.jpg', (img) => bgCity = img);
    loadImage('assets/cenarios/cenário_interno_escola.jpg', (img) => bgSchool = img);
    loadImage('assets/cenarios/cenário_interno_igreja.jpg', (img) => bgChurch = img);
    loadImage('assets/cenarios/cenário_interno_bombeiro.jpg', (img) => bgFirestation = img);

    function checkTodayEvents() {
        const today = new Date();
        const mmdd = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        
        let todaysEvents = [];
        if (brazilHolidays[mmdd]) todaysEvents.push(brazilHolidays[mmdd]);
        state.customDates.forEach(d => {
            if (d.date === mmdd) todaysEvents.push(d.title);
        });

        if (todaysEvents.length > 0) {
            setTimeout(() => {
                showDialog('Alegria', `Bom dia, Clarice! Você sabia que hoje é ${todaysEvents.join(' e ')}? Que dia especial! 🎉`, 0, null, 'Uhuu!');
            }, 1000);
        }

        const day = today.getDay(); // 0 = Domingo, 1 = Segunda
        const hour = today.getHours();
        const yearWeek = today.getFullYear() + '-' + Math.floor(today.getDate()/7);
        
        // Disparar o resumo no Domingo de noite (>= 18h) ou na Segunda de manhã (< 12h)
        if ((day === 1 && hour < 12) || (day === 0 && hour >= 18)) {
            if (state.lastWeeklySummary !== yearWeek) {
                state.lastWeeklySummary = yearWeek;
                setTimeout(() => {
                    showDialog('Alegria', `Oii! A semana está acabando (ou começando)! Você fez ${document.getElementById('dex-pts-semana').textContent} pontos na semana. Parabéns, continue brilhando! ✨`, 0, null, 'Obrigada Alegria!');
                }, todaysEvents.length > 0 ? 6000 : 1000);
            }
        }
    }

    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('login-user').value;
        if(email !== "") {
            // Inicializar áudio num clique humano (Política dos navegadores)
            if (audioCtx.state === 'suspended') audioCtx.resume();

            state.user = email;
            loginMsg.textContent = "Carregando dados...";

            loadGame(email, () => {
                loginScreen.classList.add('hidden');
                gameContainer.classList.remove('hidden');
                requestAnimationFrame(gameLoop);
                
                setTimeout(() => {
                    showDialog('Mãe', 'Bom dia! Ande pelos quadrados dourados no apartamento para ver suas atividades!');
                    checkTodayEvents();
                }, 500);
            });
        } else {
            loginMsg.textContent = "Digite um usuário para brincar!";
        }
    });

    // === MOTOR DO MAPA ===
    const TILE_SIZE = 40;
    const COLS = 20; const ROWS = 15;

    const roomMap = Array(ROWS).fill(0).map(() => Array(COLS).fill(1));
    for(let i=0; i<COLS; i++) { roomMap[0][i] = 0; roomMap[14][i] = 0; }
    for(let i=0; i<ROWS; i++) { roomMap[i][0] = 0; roomMap[i][19] = 0; }
    
    // Banheiro
    roomMap[2][1] = 28;  
    roomMap[3][4] = 17;  
    roomMap[2][5] = 18;  
    roomMap[4][1] = 52;  // Canto do banheiro (Espaço Livre)

    // Quarto Clarice
    roomMap[3][7] = 2;   
    roomMap[1][9] = 33;  
    roomMap[2][11] = 32; 
    roomMap[4][12] = 34; 
    roomMap[2][8] = 42;  // COMPUTADOR
    roomMap[1][12] = 48; // Guarda-roupa Clarice (Espaço Livre)

    // Quarto Pais
    roomMap[10][3] = 19; 
    roomMap[10][5] = 27; 
    roomMap[8][5] = 35;  
    roomMap[12][3] = 53; // Canto quarto pais (Espaço Livre)

    // Sala
    roomMap[9][10] = 29;  
    roomMap[10][10] = 38; 
    roomMap[11][10] = 36; 
    roomMap[10][7] = 37;  
    roomMap[12][8] = 46; // Vasos de planta (Espaço Livre)
    roomMap[8][11] = 47; // Estante da sala (Espaço Livre)
    roomMap[10][13] = 51; // Sofá direita (Espaço Livre)
    
    // Cozinha e Serviço
    roomMap[5][16] = 39;  
    roomMap[6][18] = 40;  
    roomMap[10][16] = 30; 
    roomMap[8][15] = 20;  
    roomMap[13][16] = 31; 
    roomMap[4][17] = 44; // Geladeira (Espaço Livre)
    roomMap[13][15] = 45; // Pia da Área de Serviço (Espaço Livre)
    roomMap[5][18] = 49; // Fogão (Espaço Livre)
    roomMap[12][16] = 50; // Máquina de lavar (Espaço Livre)

    roomMap[14][9] = 3;  roomMap[14][10] = 3; 
    roomMap[13][11] = 41; 
    
    // Gatinho Príncipe
    roomMap[13][14] = 60; 

    const cityMap = Array(ROWS).fill(0).map(() => Array(COLS).fill(1));
    for(let i=0; i<COLS; i++) { cityMap[0][i] = 0; cityMap[14][i] = 0; }
    for(let i=0; i<ROWS; i++) { cityMap[i][0] = 0; cityMap[i][19] = 0; }
    
    cityMap[8][2] = 3; cityMap[8][3] = 3; 
    cityMap[6][9] = 7; cityMap[6][10] = 7; 
    cityMap[12][11] = 8; cityMap[12][12] = 8; 
    cityMap[7][16] = 9; cityMap[7][17] = 9; 

    const schoolMap = Array(ROWS).fill(0).map(() => Array(COLS).fill(1));
    for(let i=0; i<COLS; i++) { schoolMap[0][i] = 0; schoolMap[14][i] = 0; }
    for(let i=0; i<ROWS; i++) { schoolMap[i][0] = 0; schoolMap[i][19] = 0; }
    
    schoolMap[6][9] = 11; 
    schoolMap[6][11] = 21; 
    schoolMap[14][9] = 10; schoolMap[14][10] = 10;

    const churchMap = Array(ROWS).fill(0).map(() => Array(COLS).fill(1));
    for(let i=0; i<COLS; i++) { churchMap[0][i] = 0; churchMap[14][i] = 0; }
    for(let i=0; i<ROWS; i++) { churchMap[i][0] = 0; churchMap[i][19] = 0; }
    
    churchMap[6][10] = 13; 
    churchMap[6][8] = 22;  
    churchMap[6][12] = 23; 
    churchMap[14][9] = 10; churchMap[14][10] = 10;

    const fireMap = Array(ROWS).fill(0).map(() => Array(COLS).fill(1));
    for(let i=0; i<COLS; i++) { fireMap[0][i] = 0; fireMap[14][i] = 0; }
    for(let i=0; i<ROWS; i++) { fireMap[i][0] = 0; fireMap[i][19] = 0; }
    
    fireMap[7][9] = 24;  
    fireMap[12][16] = 25; 
    fireMap[5][16] = 26; 
    fireMap[14][9] = 10; fireMap[14][10] = 10; 

    let currentMapArray = roomMap;
    let currentMapName = "room"; window.updateBGM();

    let player = { x: 8*40, y: 7*40, width: 32, height: 32, speed: 4, frameX: 1, frameY: 0, tickCount: 0, moving: false };
    let helper = { x: player.x, y: player.y + 20, frameX: 1, frameY: 0, tickCount: 0, moving: false };

    let keys = {};
    window.addEventListener('keydown', e => keys[e.key] = true);
    window.addEventListener('keyup', e => keys[e.key] = false);

    let isDialogActive = false;

    // === SISTEMA DE DIÁLOGO MODIFICADO ===
    function showDialog(name, text, points = 0, taskId = null, customYesText = null) {
        keys = {}; // Para o movimento imediatamente!
        if (document.getElementById('mobile-controls')) {
            document.getElementById('mobile-controls').style.display = 'none';
        }

        dialogName.textContent = name;
        dialogText.textContent = text; playBlip();
        
        if (portraits[name]) {
            dialogPortrait.style.backgroundImage = `url('${portraits[name]}')`;
            dialogPortrait.style.backgroundSize = 'cover';
            dialogPortrait.style.backgroundPosition = 'center';
        } else {
            dialogPortrait.style.backgroundImage = 'none';
        }

        dialogBox.classList.remove('hidden');
        isDialogActive = true;

        if (taskId && !state.completedTasks.includes(taskId)) {
            if (customYesText) {
                dialogYesBtn.textContent = customYesText;
            } else {
                dialogYesBtn.textContent = `Fazer (+${points} pts)`;
            }
            dialogYesBtn.classList.remove('hidden');
            state.pendingTaskPoints = points;
            dialogYesBtn.dataset.taskId = taskId;
        } else {
            dialogYesBtn.classList.add('hidden');
        }
    }

    function _closeDialog() {
        dialogBox.classList.add('hidden');
        if (document.getElementById('mobile-controls') && pokedexScreen.classList.contains('hidden')) {
            document.getElementById('mobile-controls').style.display = '';
        }
        keys = {}; // Limpa de novo caso o usuário tenha segurado
        setTimeout(() => isDialogActive = false, 300); // Dá tempo de tirar o dedo
    }

    dialogNextBtn.addEventListener('click', () => {
        _closeDialog();
    });

    dialogYesBtn.addEventListener('click', () => {
        let taskId = dialogYesBtn.dataset.taskId;

        if (taskId === 'open_pokedex') {
            _closeDialog();
            openPokedex();
            return;
        }

        playCoin(); // Toca o som de pegar moeda
        updateScore(state.pendingTaskPoints);
        state.completedTasks.push(taskId);
        saveGame(); // Salvar a ação localmente/firebase
        _closeDialog();
    });

    function updateScore(pts) {
        state.score += pts;
        document.getElementById('score').textContent = state.score;
        anyaNotify(`Waku waku! Você ganhou +${pts} pontos!`);
        saveGame();
    }

    // Função auxiliar para Notificações da Anya
    function anyaNotify(text) {
        if (!isDialogActive) {
            showDialog('Anya', text, 0, null, 'Legal!');
        }
    }

    // Função de Confetes
    function triggerCelebration() {
        pokedexScreen.classList.add('hidden');
        if(timeInterval) clearInterval(timeInterval);
        
        // Efeito Confete usando a lib do CDN
        var duration = 3 * 1000;
        var animationEnd = Date.now() + duration;
        var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        function randomInRange(min, max) { return Math.random() * (max - min) + min; }

        var interval = setInterval(function() {
            var timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            var particleCount = 50 * (timeLeft / duration);
            
            if(window.confetti) {
                confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
                confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
            }
        }, 250);

        setTimeout(() => {
            showDialog('Anya', 'Waku Waku! Parabéns Clarice! Você alcançou um objetivo incrível! Estou muito orgulhosa, toma uns balões!', 0, null, 'Eba!');
        }, 500);
    }

    // === LÓGICA DA POKEDEX (ROTINA-DEX) ===
    const pokedexScreen = document.getElementById('pokedex-screen');
    const dexClose = document.getElementById('dex-close');
    const dexTime = document.getElementById('dex-time');
    let timeInterval;

    function renderGoals() {
        const list = document.getElementById('dex-goals-list');
        list.innerHTML = '';
        state.goals.forEach(goal => {
            const li = document.createElement('li');
            li.className = 'goal-item';
            
            const btnDelete = goal.fixed ? '' : `<button onclick="deleteGoal('${goal.id}')" style="background:#e53e3e; color:white; border:none; border-radius:4px; padding:2px 6px; cursor:pointer;">X</button>`;
            
            let actionHtml = '';
            if (goal.done) {
                actionHtml = `<span style="color:#48bb78; font-weight:bold;">Comprado ✅</span>`;
            } else if (goal.points > 0) {
                let canBuy = state.score >= goal.points;
                actionHtml = `<button class="btn-buy" ${canBuy ? '' : 'disabled'} onclick="buyGoal('${goal.id}')">Comprar</button>`;
            } else {
                actionHtml = `<input type="checkbox" onchange="toggleGoal('${goal.id}', this.checked)">`;
            }

            li.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:10px;">
                    <span style="text-decoration: ${goal.done ? 'line-through' : 'none'}; color: ${goal.fixed ? '#2b6cb0' : '#222'}; flex:1;">
                        ${goal.name} ${goal.points ? `(<span style="color:#ed8936; font-weight:bold;">${goal.points} pts</span>)` : ''}
                    </span>
                    ${actionHtml}
                    ${btnDelete}
                </div>
            `;
            list.appendChild(li);
        });
    }

    window.buyGoal = (id) => {
        let g = state.goals.find(g => g.id.toString() === id.toString());
        if (g && state.score >= g.points && !g.done) {
            playTada();
            state.score -= g.points;
            g.done = true;
            document.getElementById('score').textContent = state.score;
            document.getElementById('dex-pts-hoje').textContent = state.score;
            document.getElementById('dex-pts-semana').textContent = state.score;
            saveGame(); // Salvar a compra!
            
            triggerCelebration();
            setTimeout(() => {
                anyaNotify(`Parabéns! Você comprou "${g.name}" e seus pais foram avisados!`);
            }, 1000);
            renderGoals();
        }
    };

    window.toggleGoal = (id, isDone) => {
        let g = state.goals.find(g => g.id.toString() === id.toString());
        if(g) {
            g.done = isDone;
            saveGame();
            renderGoals();
            if (isDone) {
                playTada();
                triggerCelebration();
            }
        }
    };

    window.deleteGoal = (id) => {
        state.goals = state.goals.filter(g => g.id.toString() !== id.toString());
        renderGoals();
    };

    function renderAlarms() {
        const list = document.getElementById('dex-alarms-list');
        list.innerHTML = '';
        state.alarms.forEach(alarm => {
            const li = document.createElement('li');
            li.className = 'alarm-item';
            li.innerHTML = `
                <span>⏰ ${alarm.time} - ${alarm.label}</span>
                <button onclick="deleteAlarm(${alarm.id})">X</button>
            `;
            list.appendChild(li);
        });
    }

    window.deleteAlarm = (id) => {
        state.alarms = state.alarms.filter(a => a.id !== id);
        renderAlarms();
    };

    let currentCalDate = new Date();

    const holidayColors = {
        '01-01': '#ecc94b', // Ano Novo - Dourado
        '04-21': '#a0aec0', // Tiradentes - Cinza
        '05-01': '#a0aec0', // Trabalhador
        '09-07': '#48bb78', // Independência - Verde
        '10-12': '#4299e1', // Crianças - Azul
        '10-15': '#9f7aea', // Professor - Roxo
        '11-02': '#a0aec0', // Finados
        '11-15': '#48bb78', // República - Verde
        '11-20': '#ed8936', // Consciência - Laranja
        '12-25': '#f56565'  // Natal - Vermelho
    };

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    function renderVisualCalendar() {
        const grid = document.getElementById('cal-grid');
        const monthYearLabel = document.getElementById('cal-month-year');
        grid.innerHTML = '';
        
        let year = currentCalDate.getFullYear();
        let month = currentCalDate.getMonth();
        
        monthYearLabel.textContent = `${monthNames[month]} ${year}`;
        
        const firstDayIndex = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Espaços vazios antes do dia 1
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyDiv = document.createElement('div');
            grid.appendChild(emptyDiv);
        }
        
        // Renderizar dias
        for (let i = 1; i <= daysInMonth; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.textContent = i;
            dayDiv.style.padding = "5px 0";
            dayDiv.style.border = "1px solid #cbd5e1";
            dayDiv.style.cursor = "pointer";
            dayDiv.style.borderRadius = "3px";
            dayDiv.style.background = "white";

            const mmdd = String(month + 1).padStart(2, '0') + '-' + String(i).padStart(2, '0');
            
            let eventText = null;

            // Feriado fixo?
            if (brazilHolidays[mmdd]) {
                dayDiv.style.background = holidayColors[mmdd] || '#a0aec0';
                dayDiv.style.color = "white";
                eventText = brazilHolidays[mmdd];
            }

            // Data Customizada?
            let customEvent = state.customDates.find(d => d.date === mmdd);
            if (customEvent) {
                dayDiv.style.background = '#ed64a6'; // Rosa para Aniversários/Especiais
                dayDiv.style.color = "white";
                eventText = eventText ? eventText + " + " + customEvent.title : customEvent.title;
            }

            if (eventText) {
                dayDiv.title = eventText; // Tooltip padrão do navegador
            }

            dayDiv.onclick = () => {
                const infoDiv = document.getElementById('cal-selected-info');
                if (eventText) {
                    let ptDate = `${String(i).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;
                    infoDiv.textContent = `${ptDate}: ${eventText}`;
                } else {
                    infoDiv.textContent = "";
                }
            };

            grid.appendChild(dayDiv);
        }
    }

    document.getElementById('cal-prev').addEventListener('click', () => {
        currentCalDate.setMonth(currentCalDate.getMonth() - 1);
        document.getElementById('cal-selected-info').textContent = "";
        renderVisualCalendar();
    });

    document.getElementById('cal-next').addEventListener('click', () => {
        currentCalDate.setMonth(currentCalDate.getMonth() + 1);
        document.getElementById('cal-selected-info').textContent = "";
        renderVisualCalendar();
    });

    window.deleteCustomDate = (id) => {
        state.customDates = state.customDates.filter(d => d.id !== id);
        renderVisualCalendar();
    };

    function renderObjectsDropdown() {
        const scenario = document.getElementById('task-scenario').value;
        const selectObj = document.getElementById('task-object');
        selectObj.innerHTML = '';
        if(mapObjects[scenario]) {
            mapObjects[scenario].forEach(obj => {
                const opt = document.createElement('option');
                opt.value = obj.id;
                opt.textContent = obj.name;
                selectObj.appendChild(opt);
            });
        }
    }

    document.getElementById('task-scenario').addEventListener('change', renderObjectsDropdown);

    // Eventos de adicionar
    document.getElementById('btn-add-date').addEventListener('click', () => {
        const title = document.getElementById('date-title').value;
        const rawDate = document.getElementById('date-value').value; // YYYY-MM-DD
        if(title && rawDate) {
            const parts = rawDate.split('-');
            const mmdd = `${parts[1]}-${parts[2]}`; // Pega só Mês-Dia
            
            state.customDates.push({ id: 'date_' + Date.now(), date: mmdd, title: title });
            document.getElementById('date-title').value = '';
            document.getElementById('date-value').value = '';
            renderVisualCalendar();
            setTimeout(() => anyaNotify("Data especial adicionada ao calendário com sucesso!"), 500);
        } else {
            alert("Preencha o nome da data e selecione o dia.");
        }
    });

    document.getElementById('btn-add-goal').addEventListener('click', () => {
        const name = document.getElementById('goal-name').value;
        const pts = parseInt(document.getElementById('goal-points').value) || 0;
        if(name) {
            state.goals.push({ id: Date.now(), name, points: pts, done: false });
            document.getElementById('goal-name').value = '';
            document.getElementById('goal-points').value = '';
            renderGoals();
            setTimeout(() => anyaNotify("Clarice! Seus pais acabaram de adicionar um novo objetivo na Rotina-Dex!"), 500);
        }
    });

    document.getElementById('btn-add-alarm').addEventListener('click', () => {
        const time = document.getElementById('alarm-time').value;
        const label = document.getElementById('alarm-label').value;
        if(time && label) {
            state.alarms.push({ id: Date.now(), time, label });
            document.getElementById('alarm-time').value = '';
            document.getElementById('alarm-label').value = '';
            renderAlarms();
        }
    });

    document.getElementById('btn-add-task').addEventListener('click', () => {
        const name = document.getElementById('task-name').value;
        const pts = parseInt(document.getElementById('task-points').value) || 0;
        const scenario = document.getElementById('task-scenario').value;
        const tileId = parseInt(document.getElementById('task-object').value);
        if(name) {
            state.customTasks.push({
                id: 'custom_' + Date.now(),
                text: name,
                points: pts,
                scenario: scenario,
                tileId: tileId
            });
            document.getElementById('task-name').value = '';
            document.getElementById('task-points').value = '';
            setTimeout(() => anyaNotify("Ei Clarice! Tem uma tarefa novinha esperando por você no mapa! Vá procurar!"), 500);
        }
    });

    function openPokedex() {
        pokedexScreen.classList.remove('hidden');
        if (document.getElementById('mobile-controls')) {
            document.getElementById('mobile-controls').style.display = 'none';
        }
        document.getElementById('dex-pts-hoje').textContent = state.score;
        document.getElementById('dex-pts-semana').textContent = state.score;
        
        renderGoals();
        renderAlarms();
        renderVisualCalendar();
        renderObjectsDropdown();
        
        timeInterval = setInterval(() => {
            const now = new Date();
            dexTime.textContent = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
        }, 1000);
    }

    dexClose.addEventListener('click', () => {
        pokedexScreen.classList.add('hidden');
        if (document.getElementById('mobile-controls')) {
            document.getElementById('mobile-controls').style.display = '';
        }
        clearInterval(timeInterval);
        document.getElementById('pais-lock').classList.remove('hidden');
        document.getElementById('pais-content').classList.add('hidden');
        document.getElementById('pais-senha').value = '';
        document.getElementById('pais-senha').value = '';
    });

    // Abas da Pokedex
    const tabs = document.querySelectorAll('.dex-tab');
    const contents = document.querySelectorAll('.dex-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            let target = tab.dataset.target;
            
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.add('hidden'));
            
            tab.classList.add('active');
            document.getElementById(target).classList.remove('hidden');
        });
    });

    // Desbloquear Aba dos Pais
    document.getElementById('btn-unlock-pais').addEventListener('click', () => {
        const pass = document.getElementById('pais-senha').value;
        if(pass === '2016') {
            document.getElementById('pais-lock').classList.add('hidden');
            document.getElementById('pais-content').classList.remove('hidden');
            document.getElementById('pais-erro').classList.add('hidden');
        } else {
            document.getElementById('pais-erro').classList.remove('hidden');
        }
    });

    // Botão de Pedido Especial (Área dos Pais)
    document.getElementById('btn-special-request').addEventListener('click', () => {
        const reqName = document.getElementById('special-req-name').value;
        if (reqName) {
            state.specialRequestText = reqName;
            roomMap[10][4] = 43; 
            setTimeout(() => anyaNotify("Atenção! Missão especial ativada na cama dos seus pais! Vale muitos pontos!"), 500);
        }
    });

    // === SISTEMA DE COLISÃO ===
    function checkCollision(newX, newY) {
        let left = Math.floor(newX / TILE_SIZE);
        let right = Math.floor((newX + player.width - 1) / TILE_SIZE);
        let top = Math.floor(newY / TILE_SIZE);
        let bottom = Math.floor((newY + player.height - 1) / TILE_SIZE);

        if (left < 0 || right >= COLS || top < 0 || bottom >= ROWS) return true;

        let t1 = currentMapArray[top][left];
        let t2 = currentMapArray[top][right];
        let t3 = currentMapArray[bottom][left];
        let t4 = currentMapArray[bottom][right];

        if (t1===0 || t2===0 || t3===0 || t4===0) return true;

        let centerTile = currentMapArray[Math.floor((newY + player.height/2)/TILE_SIZE)][Math.floor((newX + player.width/2)/TILE_SIZE)];
        
        let customTask = state.customTasks.find(t => t.tileId === centerTile && t.scenario === currentMapName && !state.completedTasks.includes(t.id));
        if (customTask && !isDialogActive) {
            showDialog('Pai/Mãe', customTask.text, customTask.points, customTask.id);
            return true;
        }

        if (currentMapName === "room") {
            let isSunday = new Date().getDay() === 0;

            if (centerTile === 42 && !isDialogActive) {
                showDialog('Anya', 'Você quer ligar o seu computador para ver sua Rotina-Dex?', 0, 'open_pokedex', 'Sim, ligar');
                return true;
            }

            if (centerTile === 43 && !isDialogActive && !state.completedTasks.includes('pedido_especial')) {
                showDialog('Pai', `Filha, faça este pedido específico: ${state.specialRequestText}`, 30, 'pedido_especial');
                return true;
            }

            if (centerTile === 2 && !isDialogActive) {
                if (isSunday && !state.completedTasks.includes('domingo_cama')) {
                    showDialog('Clarice', 'É Domingo! Acordei cedo (6:30) sem reclamar?', 20, 'domingo_cama');
                } else if (!state.completedTasks.includes('cama')) {
                    showDialog('Mãe', 'Você já arrumou a sua cama hoje?', 10, 'cama');
                }
                return true;
            }

            if (centerTile === 31 && !isDialogActive && !state.completedTasks.includes('lixo')) {
                showDialog('Mãe', 'Você já tirou o lixo da cozinha e jogou fora hoje?', 10, 'lixo');
                return true;
            }
            if (centerTile === 32 && !isDialogActive && !state.completedTasks.includes('dormir_horario')) {
                showDialog('Pai', 'Você foi dormir no horário certo (máximo 23:30) ontem?', 15, 'dormir_horario');
                return true;
            }
            if (centerTile === 33 && !isDialogActive && !state.completedTasks.includes('arrumou_escola')) {
                showDialog('Mãe', 'Você já se arrumou para ir à escola?', 10, 'arrumou_escola');
                return true;
            }
            if (centerTile === 34 && !isDialogActive && !state.completedTasks.includes('pijama')) {
                showDialog('Mãe', 'Você já arrumou e guardou o seu pijama no quarto?', 10, 'pijama');
                return true;
            }
            if (centerTile === 35 && !isDialogActive && !state.completedTasks.includes('po')) {
                showDialog('Mãe', 'Você tirou o pó dos móveis hoje?', 10, 'po');
                return true;
            }
            if (centerTile === 36 && !isDialogActive && !state.completedTasks.includes('varrer')) {
                showDialog('Avó', 'Você ajudou varrendo a casa direitinho?', 15, 'varrer');
                return true;
            }
            if (centerTile === 37 && !isDialogActive && !state.completedTasks.includes('ler')) {
                showDialog('Pai', 'Você tirou um tempo para ler sem ninguém pedir?', 20, 'ler');
                return true;
            }
            if (centerTile === 29 && !isDialogActive && !state.completedTasks.includes('tv')) {
                showDialog('Clarice', 'Assistir TV ou Brincar? Lembre-se, no máximo 1h30m!', 10, 'tv');
                return true;
            }
            if (centerTile === 38 && !isDialogActive && !state.completedTasks.includes('celular')) {
                showDialog('Clarice', 'Já coloquei meu celular para carregar?', 10, 'celular');
                return true;
            }
            if (centerTile === 39 && !isDialogActive && !state.completedTasks.includes('louca')) {
                showDialog('Avó', 'Você lavou a sua louça da refeição?', 15, 'louca');
                return true;
            }
            if (centerTile === 40 && !isDialogActive && !state.completedTasks.includes('animais')) {
                showDialog('Clarice', 'Já coloquei comida e água para os animais?', 15, 'animais');
                return true;
            }
            if (centerTile === 41 && !isDialogActive && !state.completedTasks.includes('gato')) {
                showDialog('Clarice', 'Já limpei as fezes do gato na varanda?', 15, 'gato');
                return true;
            }

            if (centerTile === 17 && !isDialogActive && !state.completedTasks.includes('dentes')) {
                showDialog('Mãe', 'Hora da higiene! Já escovou os dentes?', 10, 'dentes');
                return true;
            }
            if (centerTile === 28 && !isDialogActive && !state.completedTasks.includes('perfume')) {
                showDialog('Mãe', 'Você já passou desodorante e perfume?', 10, 'perfume');
                return true;
            }
            if (centerTile === 18 && !isDialogActive && !state.completedTasks.includes('banho')) {
                showDialog('Mãe', 'O banho está pronto na banheira! Já tomou banho hoje?', 15, 'banho');
                return true;
            }
            if (centerTile === 19 && !isDialogActive && !state.completedTasks.includes('estudo_biblico')) {
                showDialog('Mãe', 'Nós já fizemos o nosso estudo bíblico de hoje?', 20, 'estudo_biblico');
                return true;
            }
            if (centerTile === 27 && !isDialogActive && !state.completedTasks.includes('devocional')) {
                showDialog('Pai', 'Bom dia filha! Fez seu devocional de hoje?', 15, 'devocional');
                return true;
            }
            if (centerTile === 20 && !isDialogActive && !state.completedTasks.includes('cafe')) {
                showDialog('Avó', 'Bom dia! Tomou o café da manhã direitinho?', 10, 'cafe');
                return true;
            }
            if (centerTile === 30 && !isDialogActive && !state.completedTasks.includes('almoco')) {
                showDialog('Avó', 'Hora da refeição (Lanche, Almoço ou Jantar)! Fez a oração antes de comer?', 15, 'almoco');
                return true;
            }
            if (centerTile === 60 && !isDialogActive) {
                showDialog('Príncipe', 'Miau! Miau! 🐈', 0, null, 'Fazer carinho');
                return true;
            }
            if (centerTile === 3) {
                currentMapArray = cityMap; currentMapName = "city"; window.updateBGM();
                player.x = 2 * TILE_SIZE; player.y = 9 * TILE_SIZE;
                return true; 
            }
        } 
        else if (currentMapName === "city") {
            if (centerTile === 3) {
                currentMapArray = roomMap; currentMapName = "room"; window.updateBGM();
                player.x = 9 * TILE_SIZE; player.y = 12 * TILE_SIZE;
                return true;
            }
            if (centerTile === 7) {
                currentMapArray = schoolMap; currentMapName = "school"; window.updateBGM();
                player.x = 9 * TILE_SIZE; player.y = 12 * TILE_SIZE;
                return true;
            }
            if (centerTile === 8) {
                currentMapArray = churchMap; currentMapName = "church"; window.updateBGM();
                player.x = 9 * TILE_SIZE; player.y = 12 * TILE_SIZE;
                return true;
            }
            if (centerTile === 9) {
                currentMapArray = fireMap; currentMapName = "firestation"; window.updateBGM();
                player.x = 9 * TILE_SIZE; player.y = 12 * TILE_SIZE;
                return true;
            }
        }
        else if (currentMapName === "school") {
            if (centerTile === 10) {
                currentMapArray = cityMap; currentMapName = "city"; window.updateBGM();
                player.x = 9 * TILE_SIZE; player.y = 7 * TILE_SIZE;
                return true;
            }
            if (centerTile === 11 && !isDialogActive && !state.completedTasks.includes('escola_estudo')) {
                showDialog('Anya', 'Hora de Estudar a matéria do dia!', 10, 'escola_estudo');
                return true;
            }
            if (centerTile === 21 && !isDialogActive && !state.completedTasks.includes('licao_casa')) {
                showDialog('Anya', 'Já fez a lição de casa de hoje?', 15, 'licao_casa');
                return true;
            }
        }
        else if (currentMapName === "church") {
            if (centerTile === 10) {
                currentMapArray = cityMap; currentMapName = "city"; window.updateBGM();
                player.x = 12 * TILE_SIZE; player.y = 13 * TILE_SIZE;
                return true;
            }
            if (centerTile === 13 && !isDialogActive && !state.completedTasks.includes('igreja_culto')) {
                showDialog('Pai', 'Amém! Sente-se aqui para acompanharmos o culto de Domingo.', 15, 'igreja_culto');
                return true;
            }
            if (centerTile === 22 && !isDialogActive && !state.completedTasks.includes('decorar_versiculo')) {
                showDialog('Pai', 'Filha, fale o versículo que você decorou na semana!', 15, 'decorar_versiculo');
                return true;
            }
            if (centerTile === 23 && !isDialogActive && !state.completedTasks.includes('atividade_kids')) {
                showDialog('Pai', 'Mostre a atividade de casa do Kids que você fez.', 15, 'atividade_kids');
                return true;
            }
        }
        else if (currentMapName === "firestation") {
            if (centerTile === 10) {
                currentMapArray = cityMap; currentMapName = "city"; window.updateBGM();
                player.x = 17 * TILE_SIZE; player.y = 8 * TILE_SIZE;
                return true;
            }
            if (centerTile === 24 && !isDialogActive && !state.completedTasks.includes('ir_bombeiro')) {
                showDialog('Pai', 'Você cumpriu o seu compromisso de vir ao Bombeiro (12:40 as 16:30)?', 15, 'ir_bombeiro');
                return true;
            }
            if (centerTile === 25 && !isDialogActive && !state.completedTasks.includes('live_bombeiro')) {
                showDialog('Pai', 'Muito bem! Você já assistiu a live do bombeiro?', 10, 'live_bombeiro');
                return true;
            }
            if (centerTile === 26 && !isDialogActive && !state.completedTasks.includes('desafio_semana')) {
                showDialog('Pai', 'Você conseguiu completar o Desafio da Semana do Bombeiro?', 20, 'desafio_semana');
                return true;
            }
        }
        return false;
    }

    function update() {
        if (isDialogActive) return;

        let newX = player.x;
        let newY = player.y;
        player.moving = false;

        if (keys['ArrowUp'] || keys['w']) { newY -= player.speed; player.frameY = 1; player.moving = true; }
        else if (keys['ArrowDown'] || keys['s']) { newY += player.speed; player.frameY = 0; player.moving = true; }
        else if (keys['ArrowLeft'] || keys['a']) { newX -= player.speed; player.frameY = 2; player.moving = true; }
        else if (keys['ArrowRight'] || keys['d']) { newX += player.speed; player.frameY = 3; player.moving = true; }

        if (!checkCollision(newX, player.y)) player.x = newX;
        if (!checkCollision(player.x, newY)) player.y = newY;

        if (player.moving) {
            player.tickCount++;
            if (player.tickCount > 10) { 
                player.frameX = (player.frameX + 1) % 3; 
                player.tickCount = 0;
            }
        } else {
            player.frameX = 1; 
            player.tickCount = 0;
        }

        let dist = Math.hypot(player.x - helper.x, player.y - helper.y);
        helper.moving = false;
        if (dist > 40) {
            helper.moving = true;
            if(helper.x < player.x - 10) { helper.x += player.speed - 0.5; helper.frameY = 3; }
            else if(helper.x > player.x + 10) { helper.x -= player.speed - 0.5; helper.frameY = 2; }
            if(helper.y < player.y - 10) { helper.y += player.speed - 0.5; helper.frameY = 0; }
            else if(helper.y > player.y + 10) { helper.y -= player.speed - 0.5; helper.frameY = 1; }
        }

        if (helper.moving) {
            helper.tickCount++;
            if (helper.tickCount > 10) {
                helper.frameX = (helper.frameX + 1) % 3;
                helper.tickCount = 0;
            }
        } else {
            helper.frameX = 1;
        }

        // Lembretes Periódicos da Anya (a cada 45 segundos)
        if (Date.now() - lastAnyaReminder > 45000 && !isDialogActive) {
            lastAnyaReminder = Date.now();
            if (Math.random() > 0.5 && state.alarms.length > 0) {
                let alarm = state.alarms[Math.floor(Math.random() * state.alarms.length)];
                anyaNotify(`Waku Waku! Lembrete pra você: ${alarm.time} - ${alarm.label}!`);
            } else {
                anyaNotify(`Continue assim, Clarice! Você já tem ${state.score} pontos! Vamos explorar os mapas!`);
            }
        }
    }

    // Atualização do Relógio no HUD
    const hudClock = document.getElementById('hud-clock');
    setInterval(() => {
        const now = new Date();
        if (hudClock) {
            hudClock.textContent = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
        }
    }, 1000);

    function drawMap() {
        let bg;
        if (currentMapName === 'room') bg = bgRoom;
        else if (currentMapName === 'city') bg = bgCity;
        else if (currentMapName === 'school') bg = bgSchool;
        else if (currentMapName === 'church') bg = bgChurch;
        else if (currentMapName === 'firestation') bg = bgFirestation;

        if (bg) {
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
            
            // Ciclo Dia/Noite apenas no mapa externo (city)
            if (currentMapName === 'city') {
                const hour = new Date().getHours();
                // Madrugada/Noite (19h às 05h) -> Escuro/Azulado
                if (hour >= 19 || hour <= 5) {
                    ctx.fillStyle = 'rgba(10, 10, 40, 0.65)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                } 
                // Pôr do Sol (17h e 18h) -> Alaranjado
                else if (hour === 17 || hour === 18) {
                    ctx.fillStyle = 'rgba(255, 100, 0, 0.25)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }
        } else {
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(0,0, canvas.width, canvas.height);
        }

        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)'; 
        
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                let tile = currentMapArray[row][col];
                let x = col * TILE_SIZE;
                let y = row * TILE_SIZE;

                let drawBox = false;

                if (tile > 1 && tile !== 19 && tile !== 20 && tile !== 27 && tile !== 60 && tile < 44) {
                    drawBox = true;
                }
                
                if (tile >= 44 && tile <= 59) {
                    let hasTask = state.customTasks.some(t => t.tileId === tile && t.scenario === currentMapName && !state.completedTasks.includes(t.id));
                    if (hasTask) {
                        drawBox = true;
                    }
                }

                if (drawBox) {
                    if (tile === 42 || tile === 43) {
                        ctx.fillStyle = 'rgba(0, 255, 255, 0.5)'; 
                        ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
                    } else if (tile >= 44) {
                        ctx.fillStyle = 'rgba(255, 105, 180, 0.5)'; 
                        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                    } else {
                        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
                        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                    }

                    const size = TILE_SIZE * 0.6; 
                    const offset = (TILE_SIZE - size) / 2;
                    
                    ctx.fillRect(x + offset, y + offset, size, size);
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + offset, y + offset, size, size);
                }
            }
        }

        // Desenha Letreiros na Cidade
        if (currentMapName === 'city') {
            ctx.font = "bold 16px Arial";
            ctx.fillStyle = "white";
            ctx.strokeStyle = "rgba(0,0,0,0.8)";
            ctx.lineWidth = 3;
            ctx.textAlign = "center";
            
            function drawLabel(text, col, row) {
                let px = (col * TILE_SIZE);
                let py = (row * TILE_SIZE) - 5;
                ctx.strokeText(text, px, py);
                ctx.fillText(text, px, py);
            }

            drawLabel("Condomínio Porto Seguro", 3.5, 7.5);
            drawLabel("Colégio FATO", 10.5, 5.5);
            drawLabel("Igreja Porta da Paz", 12.5, 11.5);
            drawLabel("BDA", 17.5, 6.5);
        }
    }

    function drawSprite(img, obj, size, name) {
        if (!img) return; 
        const sWidth = img.width / 3; 
        const sHeight = img.height / 4; 
        ctx.drawImage(
            img, 
            obj.frameX * sWidth, obj.frameY * sHeight, sWidth, sHeight, 
            obj.x - 10, obj.y - 20, size + 10, size + 20 
        );
        
        // Desenhar nome em cima do personagem
        if (name) {
            ctx.font = "bold 13px Arial";
            ctx.fillStyle = "white";
            ctx.strokeStyle = "rgba(0,0,0,0.7)";
            ctx.lineWidth = 3;
            ctx.textAlign = "center";
            ctx.strokeText(name, obj.x + size/2 - 10, obj.y - 22);
            ctx.fillText(name, obj.x + size/2 - 10, obj.y - 22);
        }
    }

    function draw() {
        drawMap();
        
        if (currentMapName === 'room') {
            if (maeSprite) drawSprite(maeSprite, {x: 3 * TILE_SIZE, y: 10 * TILE_SIZE, frameX: 1, frameY: 0}, 36, 'Mãe');
            if (paiSprite) drawSprite(paiSprite, {x: 5 * TILE_SIZE, y: 10 * TILE_SIZE, frameX: 1, frameY: 0}, 36, 'Pai');
            if (avoSprite) drawSprite(avoSprite, {x: 15 * TILE_SIZE, y: 8 * TILE_SIZE, frameX: 1, frameY: 0}, 36, 'Avó');
            
            // Desenhar o gatinho Príncipe
            let catX = 14 * TILE_SIZE;
            let catY = 13 * TILE_SIZE;
            
            if (catSprite) {
                // Desenha a imagem JPG redimensionada no mapa
                ctx.drawImage(catSprite, catX, catY, 35, 35);
            } else {
                ctx.font = "28px Arial";
                ctx.textAlign = "center";
                ctx.fillText("🐈", catX + 20, catY + 30);
            }
            
            ctx.font = "bold 12px Arial";
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(0,0,0,0.7)";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.strokeText("Príncipe", catX + 17, catY - 5);
            ctx.fillText("Príncipe", catX + 17, catY - 5);

            // Miau flutuante
            ctx.fillStyle = "#fbbf24"; // Amarelinho
            ctx.strokeText("Miau!", catX + 17, catY - 20);
            ctx.fillText("Miau!", catX + 17, catY - 20);
        }

        drawSprite(anyaSprite, helper, 36, 'Anya'); 
        drawSprite(clariSprite, player, 42, 'Clari');
    }

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    // === CONTROLES MOBILE ===
    const bindBtn = (id, keyName) => {
        const btn = document.getElementById(id);
        if(!btn) return;
        const press = (e) => { e.preventDefault(); keys[keyName] = true; };
        const release = (e) => { e.preventDefault(); keys[keyName] = false; };
        btn.addEventListener('touchstart', press, {passive: false});
        btn.addEventListener('mousedown', press);
        btn.addEventListener('touchend', release);
        btn.addEventListener('mouseup', release);
        btn.addEventListener('mouseleave', release);
    };
    bindBtn('btn-up', 'ArrowUp');
    bindBtn('btn-down', 'ArrowDown');
    bindBtn('btn-left', 'ArrowLeft');
    bindBtn('btn-right', 'ArrowRight');

});
