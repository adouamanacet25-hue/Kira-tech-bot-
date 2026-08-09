// index.js
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
            if (shouldReconnect) startSock();
        } else if (connection === 'open') {
            console.log('✅ Bot KIRA_TECH connecté !');
        }
    });

    // Écoute des messages
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return; // Ignorer les messages du bot

        const remoteJid = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        if (!text.startsWith('!')) return; // Ignorer les messages qui ne sont pas des commandes

        const parts = text.trim().split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        // Vérifier si la commande existe
        if (commands[command]) {
            try {
                const result = await commands[command](msg, args, sock);
                if (result) {
                    let reply = result.text || '';
                    const mentions = result.mentions || [];
                    await sock.sendMessage(remoteJid, { text: reply, mentions: mentions });
                }
            } catch (error) {
                console.error(`Erreur dans la commande ${command}:`, error);
                await sock.sendMessage(remoteJid, { text: `❌ Erreur lors de l'exécution de ${command}.` });
            }
        } else {
            // Commande inconnue
            await sock.sendMessage(remoteJid, { text: `❓ Commande "${command}" inconnue. Tapez !help pour la liste.` });
        }
    });

    // Gestion des événements de groupe (join / leave)
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (action === 'add') {
            for (const participant of participants) {
                await sock.sendMessage(id, { text: `👋 ${config.welcome} @${participant.split('@')[0]}`, mentions: [participant] });
            }
        } else if (action === 'remove') {
            for (const participant of participants) {
                await sock.sendMessage(id, { text: `👋 ${config.goodbye} @${participant.split('@')[0]}`, mentions: [participant] });
            }
        }
    });
}

// Endpoint d'appairage (inchangé)
app.post('/api/pair', async (req, res) => {
    const phone = req.body.phone;
    if (!phone) return res.status(400).json({ error: 'Numéro requis' });
    try {
        if (!sock) await startSock();
        const code = await sock.requestPairingCode(phone);
        console.log(`📱 Code pour ${phone} : ${code}`);
        res.json({ code });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Serveur KIRA_TECH lancé sur le port ${PORT}`);
    await startSock();
});