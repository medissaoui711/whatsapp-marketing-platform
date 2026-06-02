import { SendEmailParams, EmailConfig } from './types';
export declare function configureEmail(cfg: EmailConfig): void;
export declare function sendEmail(params: SendEmailParams): Promise<boolean>;
export declare const email: {
    send: typeof sendEmail;
    configure: typeof configureEmail;
};


