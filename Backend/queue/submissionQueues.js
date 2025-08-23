// queue/submissionQueue.js

import { Queue } from 'bullmq';

export const evaluationQueue = new Queue('contest-evaluation', {
    connection: { url: process.env.REDIS_URL },
    defaultJobOptions: {
        attempts: 4,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: 50,
        removeOnFail: 100,
    }
});