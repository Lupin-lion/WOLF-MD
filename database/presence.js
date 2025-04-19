module.exports = {
    updatePresence: async (jid, status) => {
        console.log(`Presence update for ${jid}: ${status}`);
        return true;
    },
    getPresence: async (jid) => {
        return 'unknown';
    }
};
