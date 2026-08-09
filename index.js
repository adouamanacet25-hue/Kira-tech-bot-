require('dotenv').config();
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

let sock = null;

// Fonction pour initialiser le bot
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_data');
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'error' }),
        browser: ['KIRA_TECH', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('✅ Bot KIRA_TECH connecté !');
        } else if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connexion fermée, reconnexion...', shouldReconnect);
            if (shouldReconnect) startBot();
        }
    });

    // Commande !ping uniquement pour tester
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        if (text === '!ping') {
            await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pong !' });
        }
    });

    return sock;
}

// Endpoint d'appairage
app.post('/api/pair', async (req, res) => {
    const phone = req.body.phone;
    if (!phone) return res.status(400).json({ error: 'Numéro requis' });

    try {
        if (!sock) {
            sock = await startBot();
            // Petit délai pour laisser le temps à la connexion de s'établir
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        const code = await sock.requestPairingCode(phone);
        console.log(`📱 Code pour ${phone} : ${code}`);
        res.json({ code: code.toString() });

    } catch (error) {
        console.error('Erreur appairage :', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Serveur KIRA_TECH démarré sur le port ${PORT}`);
    // On ne démarre pas le bot ici, on attend le premier appel à /api/pair
});
