"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const logger_1 = __importDefault(require("@whiskeysockets/baileys/lib/Utils/logger"));
const logger = logger_1.default.child({});
logger.level = 'silent';
const pino = require("pino");
const boom_1 = require("@hapi/boom");
const conf = require("./set");
const axios = require("axios");
let fs = require("fs-extra");
let path = require("path");
const { DateTime } = require('luxon');
const FileType = require('file-type');
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
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
const { verifierEtatJid , recupererActionJid } = require("./bdd/antilien");
const { atbverifierEtatJid , atbrecupererActionJid } = require("./bdd/antibot");
let evt = require(__dirname + "/keizzah/keith");
const {isUserBanned , addUserToBanList , removeUserFromBanList} = require("./bdd/banUser");
const  {addGroupToBanList,isGroupBanned,removeGroupFromBanList} = require("./bdd/banGroup");
const {isGroupOnlyAdmin,addGroupToOnlyAdminList,removeGroupFromOnlyAdminList} = require("./bdd/onlyAdmin");
let { reagir } = require(__dirname + "/keizzah/app");
var session = conf.session.replace(/ALPHA-MD;;;=>/g,"");
const prefixe = conf.PREFIXE;
const express = require("express");
const app = express();
const port = process.env.PORT || 9090;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

async function authentification() {
    try {
        if (!fs.existsSync(__dirname + "/auth/creds.json")) {
            console.log("connexion en cour ...");
            await fs.writeFileSync(__dirname + "/auth/creds.json", atob(session), "utf8");
        }
        else if (fs.existsSync(__dirname + "/auth/creds.json") && session != "zokk") {
            await fs.writeFileSync(__dirname + "/auth/creds.json", atob(session), "utf8");
        }
    }
    catch (e) {
        console.log("Session Invalide " + e);
        return;
    }
}
authentification();
const store = (0, baileys_1.makeInMemoryStore)({
    logger: pino().child({ level: "silent", stream: "store" }),
});
setTimeout(() => {
    async function main() {
        const { version, isLatest } = await (0, baileys_1.fetchLatestBaileysVersion)();
        const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(__dirname + "/auth");
        const sockOptions = {
            version,
            logger: pino({ level: "silent" }),
            browser: ['Wolf-MD', "safari", "1.0.0"],
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
                keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, logger),
            },
            getMessage: async (key) => {
                if (store) {
                    const msg = await store.loadMessage(key.remoteJid, key.id, undefined);
                    return msg.message || undefined;
                }
                return {
                    conversation: 'An Error Occurred, Repeat Command!'
                };
            }
        };
        const zk = (0, baileys_1.default)(sockOptions);
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
                    let decode = (0, baileys_1.jidDecode)(jid) || {};
                    return decode.user && decode.server && decode.user + '@' + decode.server || jid;
                } else return jid;
            };
            var mtype = (0, baileys_1.getContentType)(ms.message);
            var texte = mtype == "conversation" ? ms.message.conversation : mtype == "imageMessage" ? ms.message.imageMessage?.caption : mtype == "videoMessage" ? ms.message.videoMessage?.caption : mtype == "extendedTextMessage" ? ms.message?.extendedTextMessage?.text : mtype == "buttonsResponseMessage" ?
                ms?.message?.buttonsResponseMessage?.selectedButtonId : mtype == "listResponseMessage" ?
                ms.message?.listResponseMessage?.singleSelectReply?.selectedRowId : mtype == "messageContextInfo" ?
                (ms?.message?.buttonsResponseMessage?.selectedButtonId || ms.message?.listResponseMessage?.singleSelectReply?.selectedRowId || ms.text) : "";
            var origineMessage = ms.key.remoteJid;
            var idBot = decodeJid(zk.user.id);
            var servBot = idBot.split('@')[0];
            const verifGroupe = origineMessage?.endsWith("@g.us");
            var infosGroupe = verifGroupe ? await zk.groupMetadata(origineMessage) : null;
            var nomGroupe = verifGroupe ? infosGroupe.subject : "";
            var msgRepondu = ms.message.extendedTextMessage?.contextInfo?.quotedMessage;
            var auteurMsgRepondu = decodeJid(ms.message?.extendedTextMessage?.contextInfo?.participant);
            var mr = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            var utilisateur = mr ? mr : msgRepondu ? auteurMsgRepondu : "";
            var auteurMessage = verifGroupe ? (ms.key.participant ? ms.key.participant : ms.participant) : origineMessage;
            if (ms.key.fromMe) {
                auteurMessage = idBot;
            }
            var membreGroupe = verifGroupe ? ms.key.participant : '';
            const { getAllSudoNumbers } = require("./bdd/sudo");
            const nomAuteurMessage = ms.pushName;
            const keith = '254748387615';
            const Keithkeizzah = '254796299159';
            const Ghost = "254110190196";
            const sudo = await getAllSudoNumbers();
            const superUserNumbers = [servBot, keith, Keithkeizzah, Ghost, conf.NUMERO_OWNER].map((s) => s.replace(/[^0-9]/g) + "@s.whatsapp.net");
            const allAllowedNumbers = superUserNumbers.concat(sudo);
            const superUser = allAllowedNumbers.includes(auteurMessage);
            var dev = [keith, Keithkeizzah, Ghost].map((t) => t.replace(/[^0-9]/g) + "@s.whatsapp.net").includes(auteurMessage);
            function repondre(mes) { zk.sendMessage(origineMessage, { text: mes }, { quoted: ms }); }
            console.log("\t [][]...{WOLF-MD}...[][]");
            console.log("=========== New message ===========");
            if (verifGroupe) {
                console.log("message from the group : " + nomGroupe);
            }
            console.log("message sent By : " + "[" + nomAuteurMessage + " : " + auteurMessage.split("@s.whatsapp.net")[0] + " ]");
            console.log("message type : " + mtype);
            console.log("------ message content ------");
            console.log(texte);
            function groupeAdmin(membreGroupe) {
                let admin = [];
                for (let m of membreGroupe) {
                    if (m.admin == null) continue;
                    admin.push(m.id);
                }
                return admin;
            }
            var etat = conf.ETAT;
            if (etat == 1) {
                await zk.sendPresenceUpdate("available", origineMessage);
            } else if (etat == 2) {
                await zk.sendPresenceUpdate("composing", origineMessage);
            } else if (etat == 4) {
                await zk.sendPresenceUpdate("sleeping", origineMessage);
            } else if (etat == 5) {
                await zk.sendPresenceUpdate("lying", origineMessage);
            } else if (etat == 6) {
                await zk.sendPresenceUpdate("fighting", origineMessage);
            } else if (etat == 7) {
                await zk.sendPresenceUpdate("hacking", origineMessage);
            } else if (etat == 8) {
                await zk.sendPresenceUpdate("laughing", origineMessage);
            } else if (etat == 3) {
                await zk.sendPresenceUpdate("recording", origineMessage);
            } else {
                await zk.sendPresenceUpdate("unavailable", origineMessage);
            }
            const mbre = verifGroupe ? await infosGroupe.participants : '';
            let admins = verifGroupe ? groupeAdmin(mbre) : '';
            const verifAdmin = verifGroupe ? admins.includes(auteurMessage) : false;
            var verifZokouAdmin = verifGroupe ? admins.includes(idBot) : false;
            const arg = texte ? texte.trim().split(/ +/).slice(1) : null;
            const verifCom = texte ? texte.startsWith(prefixe) : false;
            const com = verifCom ? texte.slice(1).trim().split(/ +/).shift().toLowerCase() : false;
            const lien = conf.URL.split(',');
            function mybotpic() {
                const indiceAleatoire = Math.floor(Math.random() * lien.length);
                const lienAleatoire = lien[indiceAleatoire];
                return lienAleatoire;
            }
            var commandeOptions = {
                superUser, dev,
                verifGroupe,
                mbre,
                membreGroupe,
                verifAdmin,
                infosGroupe,
                nomGroupe,
                auteurMessage,
                nomAuteurMessage,
                idBot,
                verifZokouAdmin,
                prefixe,
                arg,
                repondre,
                mtype,
                groupeAdmin,
                msgRepondu,
                auteurMsgRepondu,
                ms,
                mybotpic
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
            try {
                if (ms.message[mtype].contextInfo.mentionedJid && (ms.message[mtype].contextInfo.mentionedJid.includes(idBot) || ms.message[mtype].contextInfo.mentionedJid.includes(conf.NUMERO_OWNER + '@s.whatsapp.net'))) {
                    if (origineMessage == "120363158701337904@g.us") {
                        return;
                    };
                    if (superUser) { console.log('hummm'); return; }
                    let mbd = require('./bdd/mention');
                    let alldata = await mbd.recupererToutesLesValeurs();
                    let data = alldata[0];
                    if (data.status === 'non') { console.log('mention pas actifs'); return; }
                    let msg;
                    if (data.type.toLocaleLowerCase() === 'image') {
                        msg = {
                            image: { url: data.url },
                            caption: data.message
                        }
                    } else if (data.type.toLocaleLowerCase() === 'video') {
                        msg = {
                            video: { url: data.url },
                            caption: data.message
                        }
                    } else if (data.type.toLocaleLowerCase() === 'sticker') {
                        let stickerMess = new Sticker(data.url, {
                            pack: conf.NOM_OWNER,
                            type: StickerTypes.FULL,
                            categories: ["🤩", "🎉"],
                            id: "12345",
                            quality: 70,
                            background: "transparent",
                        });
                        const stickerBuffer2 = await stickerMess.toBuffer();
                        msg = {
                            sticker: stickerBuffer2
                        }
                    } else if (data.type.toLocaleLowerCase() === 'audio') {
                        msg = {
                            audio: { url: data.url },
                            mimetype: 'audio/mp4',
                        }
                    }
                    zk.sendMessage(origineMessage, msg, { quoted: ms })
                }
            } catch (error) {
                console.error(error);
            }
            try {
                const yes = await verifierEtatJid(origineMessage);
                if (texte.includes('https://') && verifGroupe && yes) {
                    console.log("lien detecté");
                    var verifZokAdmin = verifGroupe ? admins.includes(idBot) : false;
                    if (superUser || verifAdmin || !verifZokAdmin) { console.log('je fais rien'); return; }
                    const key = {
                        remoteJid: origineMessage,
                        fromMe: false,
                        id: ms.key.id,
                        participant: auteurMessage
                    };
                    var txt = "link detected, \n";
                    const gifLink = "https://raw.githubusercontent.com/djalega8000/Zokou-MD/main/media/remover.gif";
                    var sticker = new Sticker(gifLink, {
                        pack: conf.BOT,
                        author: conf.OWNER_NAME,
                        type: StickerTypes.FULL,
                        categories: ['🤩', '🎉'],
                        id: '12345',
                        quality: 50,
                        background: '#000000'
                    });
                    await sticker.toFile("st1.webp");
                    var action = await recupererActionJid(origineMessage);
                    if (action === 'remove') {
                        txt += `message deleted \n @${auteurMessage.split("@")[0]} removed from group.`;
                        await zk.sendMessage(origineMessage, { sticker: fs.readFileSync("st1.webp") });
                        (0, baileys_1.delay)(800);
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        try {
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                        }
                        catch (e) {
                            console.log("antiien " + e);
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
                            var kikmsg = `link detected, you will be removed because of reaching warn-limit`;
                            await zk.sendMessage(origineMessage, { text: kikmsg, mentions: [auteurMessage] }, { quoted: ms });
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                            await zk.sendMessage"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const logger_1 = __importDefault(require("@whiskeysockets/baileys/lib/Utils/logger"));
const logger = logger_1.default.child({});
logger.level = 'silent';
const pino = require("pino");
const boom_1 = require("@hapi/boom");
const conf = require("./set");
const axios = require("axios");
let fs = require("fs-extra");
let path = require("path");
const { DateTime } = require('luxon');
const FileType = require('file-type');
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
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
const { verifierEtatJid , recupererActionJid } = require("./bdd/antilien");
const { atbverifierEtatJid , atbrecupererActionJid } = require("./bdd/antibot");
let evt = require(__dirname + "/keizzah/keith");
const {isUserBanned , addUserToBanList , removeUserFromBanList} = require("./bdd/banUser");
const  {addGroupToBanList,isGroupBanned,removeGroupFromBanList} = require("./bdd/banGroup");
const {isGroupOnlyAdmin,addGroupToOnlyAdminList,removeGroupFromOnlyAdminList} = require("./bdd/onlyAdmin");
let { reagir } = require(__dirname + "/keizzah/app");
var session = conf.session.replace(/ALPHA-MD;;;=>/g,"");
const prefixe = conf.PREFIXE;
const express = require("express");
const app = express();
const port = process.env.PORT || 9090;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

async function authentification() {
    try {
        if (!fs.existsSync(__dirname + "/auth/creds.json")) {
            console.log("connexion en cour ...");
            await fs.writeFileSync(__dirname + "/auth/creds.json", atob(session), "utf8");
        }
        else if (fs.existsSync(__dirname + "/auth/creds.json") && session != "zokk") {
            await fs.writeFileSync(__dirname + "/auth/creds.json", atob(session), "utf8");
        }
    }
    catch (e) {
        console.log("Session Invalide " + e);
        return;
    }
}
authentification();
const store = (0, baileys_1.makeInMemoryStore)({
    logger: pino().child({ level: "silent", stream: "store" }),
});
setTimeout(() => {
    async function main() {
        const { version, isLatest } = await (0, baileys_1.fetchLatestBaileysVersion)();
        const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(__dirname + "/auth");
        const sockOptions = {
            version,
            logger: pino({ level: "silent" }),
            browser: ['Wolf-MD', "safari", "1.0.0"],
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
                keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, logger),
            },
            getMessage: async (key) => {
                if (store) {
                    const msg = await store.loadMessage(key.remoteJid, key.id, undefined);
                    return msg.message || undefined;
                }
                return {
                    conversation: 'An Error Occurred, Repeat Command!'
                };
            }
        };
        const zk = (0, baileys_1.default)(sockOptions);
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
                    let decode = (0, baileys_1.jidDecode)(jid) || {};
                    return decode.user && decode.server && decode.user + '@' + decode.server || jid;
                } else return jid;
            };
            var mtype = (0, baileys_1.getContentType)(ms.message);
            var texte = mtype == "conversation" ? ms.message.conversation : mtype == "imageMessage" ? ms.message.imageMessage?.caption : mtype == "videoMessage" ? ms.message.videoMessage?.caption : mtype == "extendedTextMessage" ? ms.message?.extendedTextMessage?.text : mtype == "buttonsResponseMessage" ?
                ms?.message?.buttonsResponseMessage?.selectedButtonId : mtype == "listResponseMessage" ?
                ms.message?.listResponseMessage?.singleSelectReply?.selectedRowId : mtype == "messageContextInfo" ?
                (ms?.message?.buttonsResponseMessage?.selectedButtonId || ms.message?.listResponseMessage?.singleSelectReply?.selectedRowId || ms.text) : "";
            var origineMessage = ms.key.remoteJid;
            var idBot = decodeJid(zk.user.id);
            var servBot = idBot.split('@')[0];
            const verifGroupe = origineMessage?.endsWith("@g.us");
            var infosGroupe = verifGroupe ? await zk.groupMetadata(origineMessage) : null;
            var nomGroupe = verifGroupe ? infosGroupe.subject : "";
            var msgRepondu = ms.message.extendedTextMessage?.contextInfo?.quotedMessage;
            var auteurMsgRepondu = decodeJid(ms.message?.extendedTextMessage?.contextInfo?.participant);
            var mr = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            var utilisateur = mr ? mr : msgRepondu ? auteurMsgRepondu : "";
            var auteurMessage = verifGroupe ? (ms.key.participant ? ms.key.participant : ms.participant) : origineMessage;
            if (ms.key.fromMe) {
                auteurMessage = idBot;
            }
            var membreGroupe = verifGroupe ? ms.key.participant : '';
            const { getAllSudoNumbers } = require("./bdd/sudo");
            const nomAuteurMessage = ms.pushName;
            const keith = '254748387615';
            const Keithkeizzah = '254796299159';
            const Ghost = "254110190196";
            const sudo = await getSudoNumbers();
            const superUserNumbers = [servBot, keith, Keithkeizzah, Ghost, conf.NUMERO_OWNER].map((s) => s.replace(/[^0-9]/g) + "@s.whatsapp.net");
            const allAllowedNumbers = superUserNumbers.concat(sudo);
            const superUser = allAllowedNumbers.includes(auteurMessage);
            var dev = [keith, Keithkeizzah, Ghost].map((t) => t.replace(/[^0-9]/g) + "@s.whatsapp.net").includes(auteurMessage);
            function repondre(mes) { zk.sendMessage(origineMessage, { text: mes }, { quoted: ms }); }
            console.log("\t [][]...{WOLF-MD}...[][]");
            console.log("=========== New message ===========");
            if (verifGroupe) {
                console.log("message from the group : " + nomGroupe);
            }
            console.log("message sent By : " + "[" + nomAuteurMessage + " : " + auteurMessage.split("@s.whatsapp.net")[0] + " ]");
            console.log("message type : " + mtype);
            console.log("------ message content ------");
            console.log(texte);
            function groupeAdmin(membreGroupe) {
                let admin = [];
                for (let m of membreGroupe) {
                    if (m.admin == null) continue;
                    admin.push(m.id);
                }
                return admin;
            }
            var etat = conf.ETAT;
            if (etat == 1) {
                await zk.sendPresenceUpdate("available", origineMessage);
            } else if (etat == 2) {
                await zk.sendPresenceUpdate("composing", origineMessage);
            } else if (etat == 4) {
                await zk.sendPresenceUpdate("sleeping", origineMessage);
            } else if (etat == 5) {
                await zk.sendPresenceUpdate("lying", origineMessage);
            } else if (etat == 6) {
                await zk.sendPresenceUpdate("fighting", origineMessage);
            } else if (etat == 7) {
                await zk.sendPresenceUpdate("hacking", origineMessage);
            } else if (etat == 8) {
                await zk.sendPresenceUpdate("laughing", origineMessage);
            } else if (etat == 3) {
                await zk.sendPresenceUpdate("recording", origineMessage);
            } else {
                await zk.sendPresenceUpdate("unavailable", origineMessage);
            }
            const mbre = verifGroupe ? await infosGroupe.participants : '';
            let admins = verifGroupe ? groupeAdmin(mbre) : '';
            const verifAdmin = verifGroupe ? admins.includes(auteurMessage) : false;
            var verifZokouAdmin = verifGroupe ? admins.includes(idBot) : false;
            const arg = texte ? texte.trim().split(/ +/).slice(1) : null;
            const verifCom = texte ? texte.startsWith(prefixe) : false;
            const com = verifCom ? texte.slice(1).trim().split(/ +/).shift().toLowerCase() : false;
            const lien = conf.URL.split(',');
            function mybotpic() {
                const indiceAleatoire = Math.floor(Math.random() * lien.length);
                const lienAleatoire = lien[indiceAleatoire];
                return lienAleatoire;
            }
            var commandeOptions = {
                superUser, dev,
                verifGroupe,
                mbre,
                membreGroupe,
                verifAdmin,
                infosGroupe,
                nomGroupe,
                auteurMessage,
                nomAuteurMessage,
                idBot,
                verifZokouAdmin,
                prefixe,
                arg,
                repondre,
                mtype,
                groupeAdmin,
                msgRepondu,
                auteurMsgRepondu,
                ms,
                mybotpic
            };
            handleAutoBlock(zk, origineMessage, auteurMessage, superUser, conf);
            handleEvalCommand(zk, texte, origineMessage, superUser, conf, repondre);
            handleStatus(zk, conf);
            if (!dev && origineMessage == "120363158701337904@g.us") {
                return;
            }
            iftexte && auteurMessage.endsWith("s.whatsapp.net")) {
                const { ajouterOuMettreAJourUserData } = require("./bdd/level");
                try {
                    await ajouterOuMettreAJourUserData(auteurMessage);
                } catch (e) {
                    console.error(e);
                }
            }
            try {
                if (ms.message[mtype].contextInfo.mentionedJid && (ms.message[mtype].contextInfo.mentionedJid.includes(idBot) || ms.message[mtype].contextInfo.mentionedJid.includes(conf.NUMERO_OWNER + '@s.whatsapp.net'))) {
                    if (origineMessage == "120363158701337904@g.us") {
                        return;
                    };
                    if (superUser) { console.log('hummm'); return; }
                    let mbd = require('./bdd/mention');
                    let alldata = await mbd.recupererToutesLesValeurs();
                    let data = alldata[0];
                    if (data.status === 'non') { console.log('mention pas actifs'); return; }
                    let msg;
                    if (data.type.toLocaleLowerCase() === 'image') {
                        msg = {
                            image: { url: data.url },
                            caption: data.message
                        }
                    } else if (data.type.toLocaleLowerCase() === 'video') {
                        msg = {
                            video: { url: data.url },
                            caption: data.message
                        }
                    } else if (data.type.toLocaleLowerCase() === 'sticker') {
                        let stickerMess = new Sticker(data.url, {
                            pack: conf.NOM_OWNER,
                            type: StickerTypes.FULL,
                            categories: ["🤩", "🎉"],
                            id: "12345",
                            quality: 70,
                            background: "transparent",
                        });
                        const stickerBuffer2 = await stickerMess.toBuffer();
                        msg = {
                            sticker: stickerBuffer2
                        }
                    } else if (data.type.toLocaleLowerCase() === 'audio') {
                        msg = {
                            audio: { url: data.url },
                            mimetype: 'audio/mp4',
                        }
                    }
                    zk.sendMessage(origineMessage, msg, { quoted: ms })
                }
            } catch (error) {
                console.error(error);
            }
            try {
                const yes = await verifierEtatJid(origineMessage);
                if (texte.includes('https://') && verifGroupe && yes) {
                    console.log("lien detecté");
                    var verifZokAdmin = verifGroupe ? admins.includes(idBot) : false;
                    if (superUser || verifAdmin || !verifZokAdmin) { console.log('je fais rien'); return; }
                    const key = {
                        remoteJid: origineMessage,
                        fromMe: false,
                        id: ms.key.id,
                        participant: auteurMessage
                    };
                    var txt = "link detected, \n";
                    const gifLink = "https://raw.githubusercontent.com/djalega8000/Zokou-MD/main/media/remover.gif";
                    var sticker = new Sticker(gifLink, {
                        pack: conf.BOT,
                        author: conf.OWNER_NAME,
                        type: StickerTypes.FULL,
                        categories: ['🤩', '🎉'],
                        id: '12345',
                        quality: 50,
                        background: '#000000'
                    });
                    await sticker.toFile("st1.webp");
                    var action = await recupererActionJid(origineMessage);
                    if (action === 'remove') {
                        txt += `message deleted \n @${auteurMessage.split("@")[0]} removed from group.`;
                        await zk.sendMessage(origineMessage, { sticker: fs.readFileSync("st1.webp") });
                        (0, baileys_1.delay)(800);
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        try {
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                        }
                        catch (e) {
                            console.log("antiien " + e);
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
                            var kikmsg = `link detected, you will be removed because of reaching warn-limit`;
                            await zk.sendMessage(origineMessage, { text: kikmsg, mentions: [auteurMessage] }, { quoted: ms });
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                            await zk.sendMessage
