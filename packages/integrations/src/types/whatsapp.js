"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhoneRecipient = void 0;
class PhoneRecipient {
    constructor(phone) {
        this.phone = phone;
    }
    setOnPayload(payload) {
        payload.to = this.phone;
    }
}
exports.PhoneRecipient = PhoneRecipient;
//# sourceMappingURL=whatsapp.js.map