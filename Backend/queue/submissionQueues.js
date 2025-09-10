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


export const areAllJobsCompleted = async () => {

    const waiting = await evaluationQueue.getWaitingCount();
    const active = await evaluationQueue.getActiveCount();
    const delayed = await evaluationQueue.getDelayedCount();
    const failed = await evaluationQueue.getFailedCount();
    const completed = await evaluationQueue.getCompletedCount();

    const jobStats = {
        'Waiting': waiting,
        'Active': active,
        'Delayed': delayed,
        'Failed': failed,
        "Completed": completed
    };

    console.table(jobStats);

    return waiting === 0 && active === 0 && delayed === 0;
}