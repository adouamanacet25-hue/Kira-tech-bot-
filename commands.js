// commands.js
const axios = require('axios');
const moment = require('moment');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ========== CONFIGURATION ==========
const config = {
    ownerName: process.env.OWNER_NAME || 'KIRA',
    ownerNumber: process.env.OWNER_NUMBER || '242050530427',
    channelLink: process.env.CHANNEL_LINK || 'https://whatsapp.com/channel/0029Vb7WJzp84OmBD0fEEJ2X',
    welcome: process.env.WELCOME_MESSAGE || 'Bienvenue !',
    goodbye: process.env.GOODBYE_MESSAGE || 'À Dieu !'
};

// ========== COMMANDES ==========
const commands = {

    // -------- Informations générales --------
    '!ping': (msg) => {
        const start = Date.now();
        return { text: `🏓 Pong ! Latence : ${Date.now() - start}ms` };
    },

    '!hello': () => ({ text: '👋 Salut, je suis KIRA_TECH ! Enchanté.' }),

    '!help': (msg, args) => {
        if (args.length > 0) {
            const cmd = args[0].toLowerCase();
            const desc = commandDescriptions[cmd];
            if (desc) return { text: `📖 *${cmd}*\n${desc}` };
            else return { text: `❓ Commande "${cmd}" inconnue.` };
        }
        // Affiche une liste des catégories
        const categories = Object.keys(categoryMap);
        let reply = '📚 *Liste des catégories de commandes :*\n';
        categories.forEach(cat => {
            reply += `\n▪️ *${cat}* : ${categoryMap[cat].length} commandes`;
        });
        reply += '\n\nUtilisez `!help <commande>` pour plus de détails.';
        return { text: reply };
    },

    '!about': () => ({ text: `🤖 *KIRA_TECH bot*\nVersion : v1.0\nCréateur : ${config.ownerName}\n⏰ Uptime : ... (voir !uptime)` }),

    '!time': () => ({ text: `🕐 Heure locale : ${moment().format('HH:mm:ss')}` }),

    '!date': () => ({ text: `📅 Date : ${moment().format('DD/MM/YYYY')}` }),

    '!uptime': () => {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        return { text: `⏫ En ligne depuis : ${hours}h ${minutes}m ${seconds}s` };
    },

    '!owner': () => ({ text: `👑 Propriétaire : ${config.ownerName}\n📱 Contact : ${config.ownerNumber}` }),

    '!donate': () => ({ text: `💖 Soutenez le bot :\nPayPal : ...\nBTC : ...` }),

    '!menu': () => {
        let menu = '📋 *MENU INTERACTIF KIRA_TECH*\n\n';
        Object.keys(categoryMap).forEach(cat => {
            menu += `*${cat}*\n`;
            categoryMap[cat].forEach(cmd => {
                menu += `  ${cmd}\n`;
            });
            menu += '\n';
        });
        return { text: menu };
    },

    '!rules': () => ({ text: `📜 Règles du groupe :\n1. Respectez tout le monde.\n2. Pas de spam.\n3. Utilisez !help pour les commandes.` }),

    '!terms': () => ({ text: `⚖️ Conditions : Ce bot est fourni "tel quel". Utilisation à vos risques.` }),

    '!privacy': () => ({ text: `🔒 Politique de confidentialité : Aucune donnée personnelle n'est stockée.` }),

    // -------- Divertissement --------
    '!joke': async () => {
        try {
            const res = await axios.get('https://v2.jokeapi.dev/joke/Any?type=twopart');
            const joke = res.data;
            return { text: `😄 *${joke.setup}*\n${joke.delivery}` };
        } catch {
            return { text: '😅 Pas de blague pour le moment, réessaye plus tard.' };
        }
    },

    '!meme': async () => {
        try {
            const res = await axios.get('https://meme-api.com/gimme');
            const meme = res.data;
            return { text: `🖼️ *${meme.title}*\n${meme.url}` };
        } catch {
            return { text: '😅 Pas de mème disponible.' };
        }
    },

    '!fact': async () => {
        try {
            const res = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
            return { text: `🧠 *Fun Fact :*\n${res.data.text}` };
        } catch {
            return { text: '❌ Impossible de récupérer un fait.' };
        }
    },

    '!quote': async () => {
        try {
            const res = await axios.get('https://api.quotable.io/random');
            const q = res.data;
            return { text: `💬 *"${q.content}"*\n— ${q.author}` };
        } catch {
            return { text: '❌ Pas de citation pour le moment.' };
        }
    },

    '!trivia': async () => {
        try {
            const res = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
            const q = res.data.results[0];
            const options = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
            let reply = `🧠 *${q.question}*\n\n`;
            options.forEach((opt, i) => reply += `${i+1}. ${opt}\n`);
            reply += `\nRépondez avec le numéro. (Réponse correcte : ${q.correct_answer})`;
            return { text: reply };
        } catch {
            return { text: '❌ Pas de question pour le moment.' };
        }
    },

    '!riddle': () => {
        const riddles = [
            { q: 'Qu’est-ce qui a des dents mais ne mord pas ?', a: 'Un peigne.' },
            { q: 'Je suis toujours devant mais jamais derrière. Qui suis-je ?', a: 'Le futur.' },
        ];
        const r = riddles[Math.floor(Math.random() * riddles.length)];
        return { text: `🧩 *Devinette :*\n${r.q}\n\n(La réponse est : ${r.a})` };
    },

    '!coinflip': () => {
        const res = Math.random() < 0.5 ? 'Pile' : 'Face';
        return { text: `🪙 *Résultat :* ${res}` };
    },

    '!dice': () => {
        const val = Math.floor(Math.random() * 6) + 1;
        return { text: `🎲 *Vous avez obtenu :* ${val}` };
    },

    '!8ball': (msg, args) => {
        const question = args.join(' ') || 'Pas de question ?';
        const responses = ['Oui', 'Non', 'Peut-être', 'Sans doute', 'Impossible', 'Essaye plus tard'];
        const ans = responses[Math.floor(Math.random() * responses.length)];
        return { text: `🎱 Question : ${question}\nRéponse : ${ans}` };
    },

    // -------- Météo, recherche, utilitaires --------
    '!weather': async (msg, args) => {
        const city = args.join(' ');
        if (!city) return { text: '⚠️ Utilisation : !weather <ville>' };
        try {
            const key = process.env.OPENWEATHER_API_KEY;
            if (!key) return { text: '❌ Clé API manquante. Configurez OPENWEATHER_API_KEY.' };
            const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}&units=metric&lang=fr`);
            const data = res.data;
            return { text: `🌤️ *Météo à ${data.name}*\nTempérature : ${data.main.temp}°C\nHumidité : ${data.main.humidity}%\nVent : ${data.wind.speed} m/s\n${data.weather[0].description}` };
        } catch {
            return { text: `❌ Ville "${city}" introuvable.` };
        }
    },

    '!wiki': async (msg, args) => {
        const query = args.join(' ');
        if (!query) return { text: '⚠️ Utilisation : !wiki <sujet>' };
        try {
            const res = await axios.get(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
            const page = res.data;
            if (page.title && page.extract) {
                return { text: `📖 *${page.title}*\n${page.extract.substring(0, 500)}...\n🔗 ${page.content_urls.desktop.page}` };
            } else {
                return { text: `❌ Aucun article trouvé pour "${query}".` };
            }
        } catch {
            return { text: `❌ Erreur lors de la recherche.` };
        }
    },

    '!translate': async (msg, args) => {
        // Commande : !translate <langue> <texte> ou !translate <texte> (auto-détecte)
        // Pour simplifier, on utilise Google Translate (sans clé, mais limité)
        const text = args.join(' ');
        if (!text) return { text: '⚠️ Utilisation : !translate <texte>' };
        try {
            const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=fr&dt=t&q=${encodeURIComponent(text)}`);
            const translated = res.data[0][0][0];
            return { text: `🌐 *Traduction :*\n${translated}` };
        } catch {
            return { text: '❌ Erreur de traduction.' };
        }
    },

    // -------- Gestion de groupe (admin) --------
    '!kick': async (msg, sock) => {
        // Nécessite un utilisateur mentionné ou un ID
        if (!msg.message.extendedTextMessage) return { text: '⚠️ Mentionnez un utilisateur ou répondez à son message.' };
        const mentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid;
        if (!mentioned || mentioned.length === 0) return { text: '⚠️ Mentionnez un utilisateur.' };
        const user = mentioned[0];
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [user], 'remove');
        return { text: `✅ Utilisateur ${user} expulsé.` };
    },

    '!add': async (msg, args, sock) => {
        const number = args[0];
        if (!number) return { text: '⚠️ Utilisation : !add <numéro>' };
        const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [jid], 'add');
        return { text: `✅ ${jid} ajouté au groupe.` };
    },

    '!promote': async (msg, sock) => {
        if (!msg.message.extendedTextMessage) return { text: '⚠️ Mentionnez un utilisateur.' };
        const mentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid;
        if (!mentioned) return { text: '⚠️ Mentionnez un utilisateur.' };
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [mentioned[0]], 'promote');
        return { text: `✅ ${mentioned[0]} promu administrateur.` };
    },

    '!demote': async (msg, sock) => {
        if (!msg.message.extendedTextMessage) return { text: '⚠️ Mentionnez un utilisateur.' };
        const mentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid;
        if (!mentioned) return { text: '⚠️ Mentionnez un utilisateur.' };
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [mentioned[0]], 'demote');
        return { text: `✅ ${mentioned[0]} rétrogradé.` };
    },

    // ... (toutes les autres commandes de groupe : mute, unmute, delete, warn, etc.)

    '!tagall': async (msg, sock) => {
        const group = await sock.groupMetadata(msg.key.remoteJid);
        const participants = group.participants.map(p => p.id);
        let mentions = participants.map(jid => `@${jid.split('@')[0]}`).join(' ');
        return { text: `📢 ${mentions}`, mentions: participants };
    },

    '!group': async (msg, sock) => {
        const group = await sock.groupMetadata(msg.key.remoteJid);
        let info = `📋 *Groupe : ${group.subject}*\n`;
        info += `🆔 ID : ${group.id}\n`;
        info += `👥 Membres : ${group.participants.length}\n`;
        info += `🛡️ Créé par : ${group.owner || 'Inconnu'}`;
        return { text: info };
    },

    // -------- Création de stickers, images, etc. --------
    '!sticker': async (msg, sock) => {
        // Nécessite une image (réponse à une image ou envoi d'image)
        if (!msg.message.imageMessage) return { text: '⚠️ Envoyez une image et répondez avec !sticker.' };
        // ... logique de conversion (avec ffmpeg ou sharp)
        return { text: '🖼️ Sticker créé ! (fonctionnalité en développement)' };
    },

    // -------- IA et génération --------
    '!ai': async (msg, args) => {
        const prompt = args.join(' ');
        if (!prompt) return { text: '⚠️ Utilisation : !ai <question>' };
        // Utiliser une API IA gratuite (ex: OpenRouter, ou un modèle local)
        // Pour l'exemple, on renvoie une réponse simulée
        return { text: `🤖 *IA :* Je suis désolé, je n'ai pas encore de backend IA. Utilisez !gpt ou !bard si configuré.` };
    },

    '!gpt': async (msg, args) => {
        // Similaire, mais avec ChatGPT
        return { text: '🧠 *ChatGPT :* Fonctionnalité à venir. Configurez votre clé OpenAI.' };
    },

    '!channel': () => ({ text: `📢 Suivez notre chaîne : ${config.channelLink}` }),

    '!creator': () => ({ text: `👤 Créateur : ${config.ownerName}\n📱 Contactez-moi : ${config.ownerNumber}` }),

    // -------- Commandes non implémentées (fallback) --------
    // Toutes les autres commandes (liste immense) renverront "En développement".
    // On peut les définir dynamiquement.

};

// ========== CATÉGORIES (pour !menu) ==========
const categoryMap = {
    '📌 Informations': ['!ping', '!hello', '!help', '!about', '!time', '!date', '!uptime', '!owner', '!donate', '!menu', '!rules', '!terms', '!privacy'],
    '🎉 Divertissement': ['!joke', '!meme', '!fact', '!quote', '!trivia', '!riddle', '!coinflip', '!dice', '!8ball'],
    '🌤️ Utilitaires': ['!weather', '!wiki', '!translate', '!shorten', '!qr', '!tts', '!calculate', '!currency'],
    '👑 Gestion de groupe': ['!kick', '!add', '!promote', '!demote', '!mute', '!unmute', '!delete', '!warn', '!tagall', '!group', '!setpp', '!setname', '!link', '!list', '!lock'],
    // ... ajoutez les autres catégories (Médias, Téléchargement, IA, etc.)
};

// Descriptions pour !help <commande>
const commandDescriptions = {
    '!ping': 'Vérifie la latence du bot.',
    '!hello': 'Le bot vous salue.',
    // ... ajoutez toutes les descriptions
};

// ========== EXPORT ==========
module.exports = { commands, categoryMap, commandDescriptions, config };