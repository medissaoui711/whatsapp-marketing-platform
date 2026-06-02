"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.email = void 0;
exports.configureEmail = configureEmail;
exports.sendEmail = sendEmail;
let config = null;
function configureEmail(cfg) {
    config = cfg;
}
async function sendEmail(params) {
    if (!config) {
        console.warn('Email not configured. Skipping send.');
        return false;
    }
    console.log(`[Email] Sending to: ${params.to}, Subject: ${params.subject}`);
    return true;
}
exports.email = {
    send: sendEmail,
    configure: configureEmail,
};
//# sourceMappingURL=email.js.map