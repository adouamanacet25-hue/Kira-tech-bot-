require('dotenv').config();
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { commands, config } = require('./commands');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

let sock = null;
let isReady = false;

// Fonction pour démarrer le socket
async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_data');
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['KIRA_TECH', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connexion fermée, reconnexion...', shouldReconnect);
            isReady = false;
            if (shouldReconnect) startSock();
        } else if (connection === 'open') {
            console.log('✅ Bot KIRA_TECH connecté !');
            isReady = true;
        }
    });

    // Gestion des messages (commandes)
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const remoteJid = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        if (!text.startsWith('!')) return;

        const parts = text.trim().split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (commands[command]) {
            try {
                const result = await commands[command](msg, args, sock);
                if (result) {
                    await sock.sendMessage(remoteJid, { 
                        text: result.text || '', 
                        mentions: result.mentions || [] 
                    });
                }
            } catch (error) {
                console.error(`Erreur dans ${command}:`, error);
                await sock.sendMessage(remoteJid, { text: `❌ Erreur dans ${command}` });
            }
        } else {
            await sock.sendMessage(remoteJid, { text: `❓ Commande inconnue. Tapez !help` });
        }
    });

    // Gestion des entrées/sorties de groupe
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (action === 'add') {
            for (const p of participants) {
                await sock.sendMessage(id, { 
                    text: `👋 ${config.welcome} @${p.split('@')[0]}`, 
                    mentions: [p] 
                });
            }
        } else if (action === 'remove') {
            for (const p of participants) {
                await sock.sendMessage(id, { 
                    text: `👋 ${config.goodbye} @${p.split('@')[0]}`, 
                    mentions: [p] 
                });
            }
        }
    });

    return sock;
}

// Endpoint pour générer le code d'appairage (CORRIGÉ)
app.post('/api/pair', async (req, res) => {
    const phone = req.body.phone;
    if (!phone) {
        return res.status(400).json({ error: 'Numéro requis' });
    }

    try {
        // Si le socket n'existe pas ou n'est pas prêt, on le démarre
        if (!sock || !isReady) {
            console.log('🔄 Démarrage du socket...');
            await startSock();
            // Attendre que la connexion soit établie
            await new Promise(resolve => {
                const check = setInterval(() => {
                    if (isReady) {
                        clearInterval(check);
                        resolve();
                    }
                }, 500);
            });
        }

        // Demander le code d'appairage (retourne un code numérique à 8 chiffres)
        const code = await sock.requestPairingCode(phone);
        console.log(`📱 Code pour ${phone} : ${code}`);

        res.json({ code: code.toString() });

    } catch (error) {
        console.error('Erreur appairage :', error);
        res.status(500).json({ error: 'Erreur serveur, réessayez' });
    }
});

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Serveur KIRA_TECH lancé sur le port ${PORT}`);
    // Démarrer le bot au lancement
    await startSock();
});
