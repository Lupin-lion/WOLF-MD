const fs = require('fs-extra');
const { Sequelize } = require('sequelize');

if (fs.existsSync('set.env')) {
    require('dotenv').config({ path: __dirname + '/set.env' });
}

const path = require("path");
const databasePath = path.join(__dirname, './database.db');
const DATABASE_URL = process.env.DATABASE_URL || databasePath;

module.exports = {
    session: process.env.SESSION_ID || 'wolf-md-session',
    PREFIXE: process.env.PREFIX || ".",
    GITHUB: process.env.GITHUB || 'https://github.com/Lupin-lion/WOLF-MD',
    OWNER_NAME: process.env.OWNER_NAME || "Colince Lupin",
    NUMERO_OWNER: process.env.NUMERO_OWNER || "254114146769",
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || "yes",
    AUTO_DOWNLOAD_STATUS: process.env.AUTO_DOWNLOAD_STATUS || 'no',
    AUTO_REACT: process.env.AUTO_REACTION || "no",
    URL: process.env.URL || "https://files.catbox.moe/syqk72.jpg",
    AUTO_LIKE_STATUS: process.env.AUTO_LIKE_STATUS || 'yes',
    EMOJIS: process.env.EMOJIS || "💜,😎,😂",
    AUTO_READ_MESSAGES: process.env.AUTO_READ_MESSAGES || "yes",
    AUTO_BLOCK: process.env.AUTO_BLOCK || 'no',
    GCF: process.env.GROUP_CONTROL || 'yes',
    GREET: process.env.GREET || "no",
    AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || 'viewed by WOLF-MD',
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || 'no',
    AUTOBIO: process.env.AUTOBIO || 'yes',
    ANTICALL_MSG: process.env.ANTICALL_MSG || '',
    GURL: process.env.GURL || "https://whatsapp.com/channel/0029Vaan9TF9Bb62l8wpoD47",
    EVENTS: process.env.EVENTS || "yes",
    CAPTION: process.env.CAPTION || "WOLF-MD",
    BOT: process.env.BOT_NAME || 'WOLF-MD',
    MODE: process.env.PUBLIC_MODE || "yes",
    TIMEZONE: process.env.TIMEZONE || "Africa/Nairobi",
    PM_PERMIT: process.env.PM_PERMIT || 'yes',
    HEROKU_APP_NAME: process.env.HEROKU_APP_NAME || null,
    HEROKU_API_KEY: process.env.HEROKU_API_KEY || null,
    WARN_COUNT: process.env.WARN_COUNT || '3',
    ETAT: process.env.PRESENCE || '1',
    DP: process.env.STARTING_BOT_MESSAGE || "yes",
    ADM: process.env.ANTI_DELETE_MESSAGE || 'yes',
    ANTICALL: process.env.ANTICALL || 'yes',
    DATABASE_URL,
    DATABASE: DATABASE_URL === databasePath
        ? new Sequelize({
            dialect: 'sqlite',
            storage: DATABASE_URL,
            logging: false
        })
        : new Sequelize(DATABASE_URL, {
            dialect: 'postgres',
            ssl: true,
            protocol: 'postgres',
            dialectOptions: {
                native: true,
                ssl: { require: true, rejectUnauthorized: false }
            },
            logging: false
        })
};

let fichier = require.resolve(__filename);
fs.watchFile(fichier, () => {
    fs.unwatchFile(fichier);
    console.log(`Updated ${__filename}`);
    delete require.cache[fichier];
    require(fichier);
});
