export declare function encryptField(value: string | null): string | null;
export declare function decryptField(encrypted: string | null): string | null;
export declare function getEncryptionExtension(): (client: any) => {
    $extends: {
        extArgs: import("@prisma/client/runtime/library").InternalArgs<{
            [x: string]: {
                [x: string]: unknown;
            };
        }, {
            [x: string]: {
                [x: string]: unknown;
            };
        }, {
            [x: string]: {
                [x: string]: unknown;
            };
        }, {
            [x: string]: unknown;
        }>;
    };
};


