"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
exports.configureStorage = configureStorage;
exports.uploadFile = uploadFile;
exports.deleteFile = deleteFile;
let config = null;
function configureStorage(cfg) {
    config = cfg;
}
async function uploadFile(key, buffer, mimeType) {
    if (!config) {
        throw new Error('Storage not configured');
    }
    return {
        url: `/uploads/${key}`,
        key,
        size: buffer.length,
        mimeType,
    };
}
async function deleteFile(key) {
    console.log(`[Storage] Deleting: ${key}`);
    return true;
}
exports.storage = {
    upload: uploadFile,
    delete: deleteFile,
    configure: configureStorage,
};
//# sourceMappingURL=storage.js.map