import type { CampaignStatsUpdate } from './types';
export declare class Publisher {
    private redis;
    constructor(redisUrl?: string);
    publishCampaignStats(update: CampaignStatsUpdate): Promise<void>;
    close(): Promise<void>;
}


