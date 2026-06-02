import type { CampaignStatsUpdate } from './types';
export declare class Subscriber {
    private redis;
    private subscriber;
    constructor(redisUrl?: string);
    subscribeCampaignStats(handler: (update: CampaignStatsUpdate) => void): Promise<void>;
    close(): Promise<void>;
}


