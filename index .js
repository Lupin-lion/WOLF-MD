"use strict";

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore, jidDecode, delay, DisconnectReason } = require("@whiskeysockets/baileys");
const logger = require("@whiskeysockets/baileys/lib/Utils/logger").default.child({});
logger.level = 'silent';
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const conf = require("./set");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { DateTime } = require('luxon');
const FileType = require('file-type');
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const express = require("express");
const app = express();
const port = process.env.PORT || 9090;

app.use(express.static(path.join(__dirname, 'public')));

// Import vars and bdd modules
const handleCall = require("./vars/anticall");
const autobio = require("./vars/autobio");
const handleStatus = require("./vars/statushandle");
const handleAutoReply = require("./vars/greet");
const handleAntiDelete = require("./vars/antidelete");
const handleAntiLink = require("./vars/antilink");
const handleEvalCommand = require('./vars/eval');
const handleAutoBlock = require('./vars/autoblock');
const handleAutoReact = require("./vars/autoreact");
const handleAutoRead = require("./vars/autoread");
const handleAutoLikeStatus = require("./vars/autolikestatus");
const { verifierEtatJid, recupererActionJid } = require("./bdd/antilien");
const { atbverifierEtatJid, atbrecupererActionJid } = require("./bdd/antibot");
const evt = require(__dirname + "/keizzah/keith");
const { isUserBanned, addUserToBanList, removeUserFromBanList } = require("./bdd/banUser");
const { addGroupToBanList, isGroupBanned, removeGroupFromBanList } = require("./bdd/banGroup");
const { isGroupOnlyAdmin, addGroupToOnlyAdminList, removeGroupFromOnlyAdminList } = require("./bdd/onlyAdmin");
const { reagir } = require(__dirname + "/keizzah/app");

const session = conf.session.replace(/WOLF-MD;;;=>/g, "");
const prefixe = conf.PREFIXE;

async function authentification() {
    try {
        if (!fs.existsSync(__dirname + "/auth/creds.json")) {
            console.log("Connecting...");
            await fs.writeFileSync(__dirname + "/auth/creds.json", atob(session), "utf8");
        } else if (fs.existsSync(__dirname + "/auth/creds.json") && session !== "zokk") {
            await fs.writeFileSync(__dirname + "/auth/creds.json", atob(session), "utf8");
        }
    } catch (e) {
        console.log("Invalid Session: " + e);
        return;
    }
}
authentification();

const store = makeInMemoryStore({
    logger: pino().child({ level: "silent", stream: "store" }),
});

setTimeout(() => {
    async function main() {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(__dirname + "/auth");
        const sockOptions = {
            version,
            logger: pino({ level: "silent" }),
            browser: ['WOLF-MD', "safari", "1.0.0"],
            printQRInTerminal: true,
            fireInitQueries: false,
            shouldSyncHistoryMessage: true,
            downloadHistory: true,
            syncFullHistory: true,
            generateHighQualityLinkPreview: true,
            markOnlineOnConnect: false,
            keepAliveIntervalMs: 30_000,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            getMessage: async (key) => {
                if (store) {
                    const msg = await store.loadMessage(key.remoteJid, key.id, undefined);
                    return msg.message || undefined;
                }
                return { conversation: 'An Error Occurred, Repeat Command!' };
            }
        };
        const zk = makeWASocket(sockOptions);
        store.bind(zk.ev);
        setInterval(() => { store.writeToFile("store.json"); }, 3000);

        zk.ev.on('call', async (callData) => {
            await handleCall(zk, callData);
        });
        autobio(zk, conf);
        handleAutoReply(zk, conf);
        zk.ev.on("messages.upsert", async m => {
            await handleAntiDelete(zk, conf, m);
        });
        handleAutoReact(zk, conf);
        handleAutoLikeStatus(zk, conf);
        handleAutoRead(zk, conf);

        zk.ev.on("messages.upsert", async (m) => {
            const { messages } = m;
            const ms = messages[0];
            if (!ms.message) return;

            const decodeJid = (jid) => {
                if (!jid) return jid;
                if (/:\d+@/gi.test(jid)) {
                    let decode = jidDecode(jid) || {};
                    return decode.user && decode.server && decode.user + '@' + decode.server || jid;
                }
                return jid;
            };

            const mtype = getContentType(ms.message);
            const texte = mtype == "conversation" ? ms.message.conversation :
                mtype == "imageMessage" ? ms.message.imageMessage?.caption :
                mtype == "videoMessage" ? ms.message.videoMessage?.caption :
                mtype == "extendedTextMessage" ? ms.message?.extendedTextMessage?.text :
                mtype == "buttonsResponseMessage" ? ms?.message?.buttonsResponseMessage?.selectedButtonId :
                mtype == "listResponseMessage" ? ms.message?.listResponseMessage?.singleSelectReply?.selectedRowId :
                mtype == "messageContextInfo" ? (ms?.message?.buttonsResponseMessage?.selectedButtonId || ms.message?.listResponseMessage?.singleSelectReply?.selectedRowId || ms.text) : "";

            const origineMessage = ms.key.remoteJid;
            const idBot = decodeJid(zk.user.id);
            const servBot = idBot.split('@')[0];
            const verifGroupe = origineMessage?.endsWith("@g.us");
            const infosGroupe = verifGroupe ? await zk.groupMetadata(origineMessage) : "";
            const nomGroupe = verifGroupe ? infosGroupe.subject : "";
            const msgRepondu = ms.message.extendedTextMessage?.contextInfo?.quotedMessage;
            const auteurMsgRepondu = decodeJid(ms.message?.extendedTextMessage?.contextInfo?.participant);
            const mr = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            const utilisateur = mr ? mr : msgRepondu ? auteurMsgRepondu : "";
            let auteurMessage = verifGroupe ? (ms.key.participant ? ms.key.participant : ms.participant) : origineMessage;
            if (ms.key.fromMe) {
                auteurMessage = idBot;
            }

            const membreGroupe = verifGroupe ? ms.key.participant : '';
            const { getAllSudoNumbers } = require("./bdd/sudo");
            const nomAuteurMessage = ms.pushName;
            const keith = '254748387615';
            const Keithkeizzah = '254796299159';
            const Ghost = "254110190196";
            const sudo = await getAllSudoNumbers();
            const superUserNumbers = [servBot, keith, Keithkeizzah, Ghost, conf.NUMERO_OWNER].map((s) => s.replace(/[^0-9]/g) + "@s.whatsapp.net");
            const allAllowedNumbers = superUserNumbers.concat(sudo);
            const superUser = allAllowedNumbers.includes(auteurMessage);
            const dev = [keith, Keithkeizzah, Ghost].map((t) => t.replace(/[^0-9]/g) + "@s.whatsapp.net").includes(auteurMessage);

            function repondre(mes) { zk.sendMessage(origineMessage, { text: mes }, { quoted: ms }); }

            console.log("\t [][]...{WOLF-MD}...[][]");
            console.log("=========== New message ===========");
            if (verifGroupe) {
                console.log("Message from group: " + nomGroupe);
            }
            console.log("Message sent by: " + "[" + nomAuteurMessage + " : " + auteurMessage.split("@s.whatsapp.net")[0] + " ]");
            console.log("Message type: " + mtype);
            console.log("------ Message content ------");
            console.log(texte);

            function groupeAdmin(membreGroupe) {
                let admin = [];
                for (let m of membreGroupe) {
                    if (m.admin == null) continue;
                    admin.push(m.id);
                }
                return admin;
            }

            const etat = conf.ETAT;
            if (etat == 1) {
                await zk.sendPresenceUpdate("available", origineMessage);
            } else if (etat == 2) {
                await zk.sendPresenceUpdate("composing", origineMessage);
            } else if (etat == 3) {
                await zk.sendPresenceUpdate("recording", origineMessage);
            } else {
                await zk.sendPresenceUpdate("unavailable", origineMessage);
            }

            const mbre = verifGroupe ? await infosGroupe.participants : '';
            let admins = verifGroupe ? groupeAdmin(mbre) : '';
            const verifAdmin = verifGroupe ? admins.includes(auteurMessage) : false;
            const verifZokouAdmin = verifGroupe ? admins.includes(idBot) : false;

            const arg = texte ? texte.trim().split(/ +/).slice(1) : null;
            const verifCom = texte ? texte.startsWith(prefixe) : false;
            const com = verifCom ? texte.slice(1).trim().split(/ +/).shift().toLowerCase() : false;

            const lien = conf.URL.split(',');

            function mybotpic() {
                const indiceAleatoire = Math.floor(Math.random() * lien.length);
                const lienAleatoire = lien[indiceAleatoire];
                return lienAleatoire;
            }

            const commandeOptions = {
                superUser, dev, verifGroupe, mbre, membreGroupe, verifAdmin, infosGroupe,
                nomGroupe, auteurMessage, nomAuteurMessage, idBot, verifZokouAdmin,
                prefixe, arg, repondre, mtype, groupeAdmin, msgRepondu, auteurMsgRepondu,
                ms, mybotpic
            };

            handleAutoBlock(zk, origineMessage, auteurMessage, superUser, conf);
            handleEvalCommand(zk, texte, origineMessage, superUser, conf, repondre);
            handleStatus(zk, conf);

            if (!dev && origineMessage == "120363158701337904@g.us") {
                return;
            }

            if (texte && auteurMessage.endsWith("s.whatsapp.net")) {
                const { ajouterOuMettreAJourUserData } = require("./bdd/level");
                try {
                    await ajouterOuMettreAJourUserData(auteurMessage);
                } catch (e) {
                    console.error(e);
                }
            }

            // Handle mentions
            try {
                if (ms.message[mtype]?.contextInfo?.mentionedJid && (ms.message[mtype].contextInfo.mentionedJid.includes(idBot) || ms.message[mtype].contextInfo.mentionedJid.includes(conf.NUMERO_OWNER + '@s.whatsapp.net'))) {
                    if (origineMessage == "120363158701337904@g.us") return;
                    if (superUser) return;

                    const mbd = require('./bdd/mention');
                    const alldata = await mbd	recupererToutesLesValeurs();
                    const data = alldata[0];

                    if (data.status === 'non') return;

                    let msg;
                    if (data.type.toLowerCase() === 'image') {
                        msg = { image: { url: data.url }, caption: data.message };
                    } else if (data.type.toLowerCase() === 'video') {
                        msg = { video: { url: data.url }, caption: data.message };
                    } else if (data.type.toLowerCase() === 'sticker') {
                        let stickerMess = new Sticker(data.url, {
                            pack: conf.NOM_OWNER,
                            type: StickerTypes.FULL,
                            categories: ["🤩", "🎉"],
                            id: "12345",
                            quality: 70,
                            background: "transparent",
                        });
                        const stickerBuffer2 = await stickerMess.toBuffer();
                        msg = { sticker: stickerBuffer2 };
                    } else if (data.type.toLowerCase() === 'audio') {
                        msg = { audio: { url: data.url }, mimetype: 'audio/mp4' };
                    }
                    zk.sendMessage(origineMessage, msg, { quoted: ms });
                }
            } catch (error) {
                console.error(error);
            }

            // Anti-link
            try {
                const yes = await verifierEtatJid(origineMessage);
                if (texte.includes('https://') && verifGroupe && yes) {
                    const verifZokAdmin = verifGroupe ? admins.includes(idBot) : false;
                    if (superUser || verifAdmin || !verifZokAdmin) return;

                    const key = {
                        remoteJid: origineMessage,
                        fromMe: false,
                        id: ms.key.id,
                        participant: auteurMessage
                    };
                    let txt = "Link detected, \n";
                    const gifLink = "https://raw.githubusercontent.com/djalega8000/Zokou-MD/main/media/remover.gif";
                    const sticker = new Sticker(gifLink, {
                        pack: conf.BOT,
                        author: conf.OWNER_NAME,
                        type: StickerTypes.FULL,
                        categories: ['🤩', '🎉'],
                        id: '12345',
                        quality: 50,
                        background: '#000000'
                    });
                    await sticker.toFile("st1.webp");

                    const action = await recupererActionJid(origineMessage);
                    if (action === 'remove') {
                        txt += `Message deleted \n @${auteurMessage.split("@")[0]} removed from group.`;
                        await zk.sendMessage(origineMessage, { sticker: fs.readFileSync("st1.webp") });
                        await delay(800);
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        try {
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                        } catch (e) {
                            console.log("Anti-link error: " + e);
                        }
                        await zk.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } else if (action === 'delete') {
                        txt += `Goodbye \n @${auteurMessage.split("@")[0]} Sending other group links here is prohibited!.`;
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        await zk.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } else if (action === 'warn') {
                        const { getWarnCountByJID, ajouterUtilisateurAvecWarnCount } = require('./bdd/warn');
                        let warn = await getWarnCountByJID(auteurMessage);
                        let warnlimit = conf.WARN_COUNT;
                        if (warn >= warnlimit) {
                            const kikmsg = `Link detected, you will be removed because of reaching warn-limit`;
                            await zk.sendMessage(origineMessage, { text: kikmsg, mentions: [auteurMessage] }, { quoted: ms });
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                            await zk.sendMessage(origineMessage, { delete: key });
                        } else {
                            const rest = warnlimit - warn;
                            const msg = `Link detected, your warn_count was upgraded;\n rest: ${rest}`;
                            await ajouterUtilisateurAvecWarnCount(auteurMessage);
                            await zk.sendMessage(origineMessage, { text: msg, mentions: [auteurMessage] }, { quoted: ms });
                            await zk.sendMessage(origineMessage, { delete: key });
                        }
                    }
                }
            } catch (e) {
                console.log("Anti-link error: " + e);
            }

            // Anti-bot
            try {
                const botMsg = ms.key?.id?.startsWith('BAES') && ms.key?.id?.length === 16;
                const baileysMsg = ms.key?.id?.startsWith('BAE5') && ms.key?.id?.length === 16;
                if (botMsg || baileysMsg) {
                    if (mtype === 'reactionMessage') return;
                    const antibotactiver = await atbverifierEtatJid(origineMessage);
                    if (!antibotactiver) return;
                    if (verifAdmin || auteurMessage === idBot) return;

                    const key = {
                        remoteJid: origineMessage,
                        fromMe: false,
                        id: ms.key.id,
                        participant: auteurMessage
                    };
                    let txt = "Bot detected, \n";
                    const gifLink = "https://raw.githubusercontent.com/djalega8000/Zokou-MD/main/media/remover.gif";
                    const sticker = new Sticker(gifLink, {
                        pack: 'WOLF-MD',
                        author: conf.OWNER_NAME,
                        type: StickerTypes.FULL,
                        categories: ['🤩', '🎉'],
                        id: '12345',
                        quality: 50,
                        background: '#000000'
                    });
                    await sticker.toFile("st1.webp");

                    const action = await atbrecupererActionJid(origineMessage);
                    if (action === 'remove') {
                        txt += `Message deleted \n @${auteurMessage.split("@")[0]} removed from group.`;
                        await zk.sendMessage(origineMessage, { sticker: fs.readFileSync("st1.webp") });
                        await delay(800);
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        try {
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                        } catch (e) {
                            console.log("Anti-bot error: " + e);
                        }
                        await zk.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } else if (action === 'delete') {
                        txt += `Message deleted \n @${auteurMessage.split("@")[0]} Avoid sending bot messages.`;
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        await zk.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } else if (action === 'warn') {
                        const { getWarnCountByJID, ajouterUtilisateurAvecWarnCount } = require('./bdd/warn');
                        let warn = await getWarnCountByJID(auteurMessage);
                        let warnlimit = conf.WARN_COUNT;
                        if (warn >= warnlimit) {
                            const kikmsg = `Bot detected; you will be removed because of reaching warn-limit`;
                            await zk.sendMessage(origineMessage, { text: kikmsg, mentions: [auteurMessage] }, { quoted: ms });
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                            await zk.sendMessage(origineMessage, { delete: key });
                        } else {
                            const rest = warnlimit - warn;
                            const msg = `Bot detected, your warn_count was upgraded;\n rest: ${rest}`;
                            await ajouterUtilisateurAvecWarnCount(auteurMessage);
                            await zk.sendMessage(origineMessage, { text: msg, mentions: [auteurMessage] }, { quoted: ms });
                            await zk.sendMessage(origineMessage, { delete: key });
                        }
                    }
                }
            } catch (er) {
                console.log('Anti-bot error: ' + er);
            }

            // Command execution
            if (verifCom) {
                const cd = evt.cm.find(keith => keith.nomCom === com || keith.aliases?.includes(com));
                if (cd) {
                    try {
                        if (conf.MODE.toLowerCase() !== 'yes' && !superUser) {
                            return;
                        }
                        if (!superUser && origineMessage === auteurMessage && conf.PM_PERMIT === "yes") {
                            repondre("You don't have access to commands here");
                            return;
                        }
                        if (!superUser && verifGroupe) {
                            const req = await isGroupBanned(origineMessage);
                            if (req) return;
                        }
                        if (!verifAdmin && verifGroupe) {
                            const req = await isGroupOnlyAdmin(origineMessage);
                            if (req) return;
                        }
                        if (!superUser) {
                            const req = await isUserBanned(auteurMessage);
                            if (req) {
                                repondre("You are banned from bot commands");
                                return;
                            }
                        }
                        reagir(origineMessage, zk, ms, cd.reaction);
                        cd.fonction(origineMessage, zk, commandeOptions);
                    } catch (e) {
                        console.log("Command error: " + e);
                        zk.sendMessage(origineMessage, { text: "Error: " + e }, { quoted: ms });
                    }
                }
            }
        });

        // Group participant update
        const { recupevents } = require('./bdd/welcome');
        zk.ev.on('group-participants.update', async (group) => {
            let ppgroup;
            try {
                ppgroup = await zk.profilePictureUrl(group.id, 'image');
            } catch {
                ppgroup = 'https://telegra.ph/file/c66d12099fb7a4f62d70a.jpg';
            }

            try {
                const metadata = await zk.groupMetadata(group.id);
                if (group.action == 'add' && (await recupevents(group.id, "welcome") == 'on')) {
                    let msg = `╭═══◇WOLF-MD◇═══⊷\n`;
                    let membres = group.participants;
                    for (let membre of membres) {
                        msg += `║ Hello @${membre.split("@")[0]}\n`;
                    }
                    msg += `║ *You are welcomed here* _You MAY read the group description FOR more info and Avoid getting removed_\n\n╰═══◇◇═══⊷\n\n◇ *GROUP DESCRIPTION* ◇\n\n${metadata.desc}`;
                    zk.sendMessage(group.id, { image: { url: ppgroup }, caption: msg, mentions: membres });
                } else if (group.action == 'remove' && (await recupevents(group.id, "goodbye") == 'on')) {
                    let msg = `Goodbye to that Fallen soldier, Powered by*;\n`;
                    let membres = group.participants;
                    for (let membre of membres) {
                        msg += `@${membre.split("@")[0]}\n`;
                    }
                    zk.sendMessage(group.id, { text: msg, mentions: membres });
                } else if (group.action == 'promote' && (await recupevents(group.id, "antipromote") == 'on')) {
                    if (group.author == metadata.owner || group.author == conf.NUMERO_OWNER + '@s.whatsapp.net' || group.author == decodeJid(zk.user.id) || group.author == group.participants[0]) return;
                    await zk.groupParticipantsUpdate(group.id, [group.author, group.participants[0]], "demote");
                    zk.sendMessage(group.id, {
                        text: `@${(group.author).split("@")[0]} has violated the anti-promotion rule, therefore both ${group.author.split("@")[0]} and @${(group.participants[0]).split("@")[0]} have been removed from administrative rights.`,
                        mentions: [group.author, group.participants[0]]
                    });
                } else if (group.action == 'demote' && (await recupevents(group.id, "antidemote") == 'on')) {
                    if (group.author == metadata.owner || group.author == conf.NUMERO_OWNER + '@s.whatsapp.net' || group.author == decodeJid(zk.user.id) || group.author == group.participants[0]) return;
                    await zk.groupParticipantsUpdate(group.id, [group.author], "demote");
                    await zk.groupParticipantsUpdate(group.id, [group.participants[0]], "promote");
                    zk.sendMessage(group.id, {
                        text: `@${(group.author).split("@")[0]} has violated the anti-demotion rule by removing @${(group.participants[0]).split("@")[0]}. Consequently, he has been stripped of administrative rights.`,
                        mentions: [group.author, group.participants[0]]
                    });
                }
            } catch (e) {
                console.error(e);
            }
        });

        // Cron setup
        async function activateCrons() {
            const cron = require('node-cron');
            const { getCron } = require('./bdd/cron');
            let crons = await getCron();
            if (crons.length > 0) {
                for (let i = 0; i < crons.length; i++) {
                    if (crons[i].mute_at != null) {
                        let set = crons[i].mute_at.split(':');
                        console.log(`Setting auto-mute for ${crons[i].group_id} at ${set[0]}:${set[1]}`);
                        cron.schedule(`${set[1]} ${set[0]} * * *`, async () => {
                            await zk.groupSettingUpdate(crons[i].group_id, 'announcement');
                            zk.sendMessage(crons[i].group_id, { image: { url: './media/chrono.webp' }, caption: "Hello, it's time to close the group; sayonara." });
                        }, { timezone: "Africa/Nairobi" });
                    }
                    if (crons[i].unmute_at != null) {
                        let set = crons[i].unmute_at.split(':');
                        console.log(`Setting auto-unmute for ${set[0]}:${set[1]}`);
                        cron.schedule(`${set[1]} ${set[0]} * * *`, async () => {
                            await zk.groupSettingUpdate(crons[i].group_id, 'not_announcement');
                            zk.sendMessage(crons[i].group_id, { image: { url: './media/chrono.webp' }, caption: "Good morning; It's time to open the group." });
                        }, { timezone: "Africa/Nairobi" });
                    }
                }
            } else {
                console.log('Crons not activated');
            }
        }

        // Contacts update
        zk.ev.on("contacts.upsert", async (contacts) => {
            const insertContact = (newContact) => {
                for (const contact of newContact) {
                    if (store.contacts[contact.id]) {
                        Object.assign(store.contacts[contact.id], contact);
                    } else {
                        store.contacts[contact.id] = contact;
                    }
                }
            };
            insertContact(contacts);
        });

        // Connection update
        zk.ev.on("connection.update", async (con) => {
            const { lastDisconnect, connection } = con;
            if (connection === "connecting") {
                console.log("ℹ️ WOLF-MD is connecting to your account...");
            } else if (connection === 'open') {
                await zk.groupAcceptInvite("KOvNtZbE3JC32oGAe6BQpp");
                console.log("✅ Connected successfully! Enjoy ☺️");
                console.log("Loading commands...");
                fs.readdirSync(__dirname + "/commands").forEach((fichier) => {
                    if (path.extname(fichier).toLowerCase() == ".js") {
                        try {
                            require(__dirname + "/commands/" + fichier);
                            console.log(fichier + " installed ✔️");
                        } catch (e) {
                            console.log(`${fichier} failed to load: ${e}`);
                        }
                        delay(300);
                    }
                });
                delay(700);
                const md = conf.MODE.toLowerCase() === "yes" ? "public" : conf.MODE.toLowerCase() === "no" ? "private" : "undefined";
                console.log("Commands loaded successfully ✅");

                await activateCrons();
                const date = new Date();
                const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: conf.TIMEZONE });
                const formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZone: conf.TIMEZONE });
                const getGreeting = () => {
                    const currentHour = DateTime.now().setZone(conf.TIMEZONE).hour;
                    if (currentHour >= 5 && currentHour < 12) return 'Good morning fam';
                    if (currentHour >= 12 && currentHour < 18) return 'Good afternoon ☀️';
                    if (currentHour >= 18 && currentHour < 22) return 'Good evening gee';
                    return 'Good night mzee';
                };

                if (conf.DP?.toLowerCase() === 'yes') {
                    let cmsg = `Hello 👋 *${conf.OWNER_NAME}* 😎,\n*${getGreeting()},*\n*It's ${formattedDate} 🗓️*\n*The time is ${formattedTime}.🕛*\n\n╭════⊷\n║ *『 ${conf.BOT} 𝐢𝐬 𝐎𝐧𝐥𝐢𝐧𝐞』*\n║ Prefix: [ ${prefixe} ]\n║ Mode: ${md}\n║ Total Commands: ${evt.cm.length}︎\n╰═════════════════⊷\n\n╭───◇\n┃ Thank you for choosing\n┃ *${conf.BOT}*\n╰═════════════════⊷`;
                    await zk.sendMessage(zk.user.id, {
                        text: cmsg,
                        disappearingMessagesInChat: true,
                        ephemeralExpiration: 5
                    });
                }
            } else if (connection == "close") {
                const raisonDeconnexion = new Boom(lastDisconnect?.error)?.output.statusCode;
                if (raisonDeconnexion === DisconnectReason.badSession) {
                    console.log('Invalid session, please rescan the QR code...');
                } else if (raisonDeconnexion === DisconnectReason.connectionClosed) {
                    console.log('Connection closed, reconnecting...');
                    main();
                } else if (raisonDeconnexion === DisconnectReason.connectionLost) {
                    console.log('Connection to server lost, reconnecting...');
                    main();
                } else if (raisonDeconnexion === DisconnectReason.connectionReplaced) {
                    console.log('Connection replaced, please close the other session!');
                } else if (raisonDeconnexion === DisconnectReason.loggedOut) {
                    console.log('Logged out, please rescan the QR code...');
                } else if (raisonDeconnexion === DisconnectReason.restartRequired) {
                    console.log('Restart required, restarting...');
                    main();
                } else {
                    console.log('Restarting due to error: ', raisonDeconnexion);
                    const { exec } = require("child_process");
                    exec("pm2 restart all");
                }
                main();
            }
        });

        zk.ev.on("creds.update", saveCreds);

        zk.downloadAndSaveMediaMessage = async (message, filename = '', attachExtension = true) => {
            let quoted = message.msg ? message.msg : message;
            let mime = (message.msg || message).mimetype || '';
            let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
            const stream = await downloadContentFromMessage(quoted, messageType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            let type = await FileType.fromBuffer(buffer);
            let trueFileName = './' + filename + '.' + type.ext;
            await fs.writeFileSync(trueFileName, buffer);
            return trueFileName;
        };

        zk.awaitForMessage = async (options = {}) => {
            return new Promise((resolve, reject) => {
                if (typeof options !== 'object') reject(new Error('Options must be an object'));
                if (typeof options.sender !== 'string') reject(new Error('Sender must be a string'));
                if (typeof options.chatJid !== 'string') reject(new Error('ChatJid must be a string'));
                if (options.timeout && typeof options.timeout !== 'number') reject(new Error('Timeout must be a number'));
                if (options.filter && typeof options.filter !== 'function') reject(new Error('Filter must be a function'));

                const timeout = options?.timeout || undefined;
                const filter = options?.filter || (() => true);
                let interval = undefined;

                let listener = (data) => {
                    let { type, messages } = data;
                    if (type == "notify") {
                        for (let message of messages) {
                            const fromMe = message.key.fromMe;
                            const chatId = message.key.remoteJid;
                            const isGroup = chatId.endsWith('@g.us');
                            const isStatus = chatId == 'status@broadcast';
                            const sender = fromMe ? zk.user.id.replace(/:.*@/g, '@') : (isGroup || isStatus) ? message.key.participant.replace(/:.*@/g, '@') : chatId;
                            if (sender == options.sender && chatId == options.chatJid && filter(message)) {
                                zk.ev.off('messages.upsert', listener);
                                clearTimeout(interval);
                                resolve(message);
                            }
                        }
                    }
                };

                app.get("/", (req, res) => {
                    res.sendFile(path.join(__dirname, 'keizzah', 'index.html'));
                });

                app.listen(port, () => {
                    console.log(`Server listening on http://localhost:${port}`);
                });

                zk.ev.on('messages.upsert', listener);
                if (timeout) {
                    interval = setTimeout(() => {
                        zk.ev.off('messages.upsert', listener);
                        reject(new Error('Timeout'));
                    }, timeout);
                }
            });
        };

        return zk;
    }

    let fichier = require.resolve(__filename);
    fs.watchFile(fichier, () => {
        fs.unwatchFile(fichier);
        console.log(`Updated ${__filename}`);
        delete require.cache[fichier];
        require(fichier);
    });

    main();
}, 5000);
