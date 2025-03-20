"use strict";

const { default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState, makeInMemoryStore, jidDecode, getContentType } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs-extra");
const path = require("path");
const Sticker = require("wa-sticker-formatter").Sticker;

const config = require("./set"); // Make sure your `set.js` file is correctly configured.
const logger = pino({ level: "silent" });
const store = makeInMemoryStore({ logger });
const sessionFilePath = path.resolve(__dirname, "auth", "creds.json");

async function authenticate() {
    try {
        const sessionData = config.session !== "zokk" ? atob(config.session) : null;

        if (sessionData && !fs.existsSync(sessionFilePath)) {
            fs.writeFileSync(sessionFilePath, sessionData, "utf8");
            console.log("Authentication session created.");
        }
    } catch (error) {
        console.error("Error during authentication:", error);
        process.exit(1);
    }
}

authenticate();

async function startBot() {
    try {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`Using Baileys v${version.join(".")} (Latest: ${isLatest})`);

        const { state, saveCreds } = await useMultiFileAuthState(path.resolve(__dirname, "auth"));
        const socket = makeWASocket({
            version,
            auth: state,
            logger,
            printQRInTerminal: true,
            browser: ["Wolf-MD", "Safari", "1.0"],
        });

        store.bind(socket.ev);

        // Periodically save store data
        setInterval(() => store.writeToFile(path.resolve(__dirname, "store.json")), 3000);

        // Event Handlers
        socket.ev.on("connection.update", (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "close") {
                const reason = lastDisconnect?.error?.output?.statusCode || "unknown";
                console.log(`Disconnected: ${reason}`);
                if (reason !== 401) startBot(); // Reconnect if not logged out.
            } else if (connection === "open") {
                console.log("Bot connected.");
            }
        });

        socket.ev.on("messages.upsert", async (m) => {
            const message = m.messages[0];
            if (!message.message) return;

            const from = message.key.remoteJid;
            const isGroup = from.endsWith("@g.us");
            const sender = isGroup ? message.key.participant : from;
            const contentType = getContentType(message.message);

            console.log("New message received from:", sender);
            console.log("Message content:", contentType, message.message);

            // Respond to a simple command (example for demonstration)
            if (contentType === "conversation" && message.message.conversation.startsWith(config.PREFIXE)) {
                const command = message.message.conversation.slice(config.PREFIXE.length).trim();
                if (command === "ping") {
                    await socket.sendMessage(from, { text: "Pong!" }, { quoted: message });
                }
            }
        });

        // Set presence
        async function setPresence(status) {
            const validStates = ["available", "composing", "recording", "paused"];
            if (validStates.includes(status)) {
                await socket.sendPresenceUpdate(status, null);
            } else {
                console.error(`Invalid presence state: ${status}`);
            }
        }

        // Example of media handling (image, video, etc.)
        async function downloadMedia(message) {
            const buffer = await socket.downloadMediaMessage(message);
            fs.writeFileSync("media_downloaded", buffer);
            console.log("Media downloaded.");
        }

        console.log("Bot is running...");
    } catch (error) {
        console.error("Error starting the bot:", error);
    }
}

// Initialize the bot
startBot();
