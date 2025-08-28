// worker/evaluationWorker.js

import { Worker } from 'bullmq';
import dotenv from "dotenv";
import { Submission, connectDB } from '../Models/DB.js';
import redisClient from '../redis.js';
import { deleteUserState } from '../store/contestStateService.js';
import { evaluationQueue } from './../queue/submissionQueues.js';

dotenv.config();

await connectDB();

export const evaluationWorker = new Worker('contest-evaluation', async (job) => {
    const { submissionId, contestSlug, userRegistrationId } = job.data;

    try {
        console.log(`Processing evaluation for submission: ${submissionId}`);

        await job.updateProgress(10);

        const submission = await Submission.findById(submissionId);
        if (!submission) {
            throw new Error(`Submission ${submissionId} not found`);
        }

        await job.updateProgress(25);

        const correctAnswersKey = `contest:${contestSlug}:correct_answers`;
        const correctAnswersJson = await redisClient.get(correctAnswersKey);

        if (!correctAnswersJson) {
            throw new Error(`Correct answers not found for contest ${contestSlug}`);
        }

        const correctAnswers = JSON.parse(correctAnswersJson);

        await job.updateProgress(50);

        // Map of user's answers for quick lookup
        const userAnswersMap = new Map(
            submission.answers.map(a => [a.questionId.toString(), a])
        );

        let score = 0;
        let evaluatedAnswers = [];

        // Loop through ALL correct answers (ground truth)
        for (const q of correctAnswers) {
            const userAnswer = userAnswersMap.get(q.questionId.toString());

            if (userAnswer) {
                // user attempted this question
                const isCorrect = userAnswer.answer === q.correctAnswer;
                
                evaluatedAnswers.push({
                    ...userAnswer.toObject(),
                    isCorrect,
                    correctAnswer: q.correctAnswer
                });

                if (isCorrect) score++;
            } else {
                // unanswered -> mark wrong
                evaluatedAnswers.push({
                    questionId: q.questionId,
                    answer: "",
                    correctAnswer: q.correctAnswer,
                    answerIndex: null,
                    isCorrect: false,
                    submittedAt: null
                });
            }
        }

        await job.updateProgress(75);

        submission.answers = evaluatedAnswers;
        submission.score = score;
        submission.totalQuestions = correctAnswers.length;
        submission.status = 'evaluated';
        await submission.save();

        const submissionStatus = {
            submissionId: submission._id,
            status: submission.status,
            score: submission.score,
            totalQuestions: submission.totalQuestions,
            percentage: Math.round((submission.score / submission.totalQuestions) * 100),
            contestSlug,
            userRegistrationId,
            updatedAt: submission.updatedAt
        };

        await redisClient.setEx(
            `submission:${submissionId}:status`,
            3600, // 1 hr
            JSON.stringify(submissionStatus)
        );

        await job.updateProgress(95);

        // clean up userState cache
        await deleteUserState(contestSlug, userRegistrationId);

        await job.updateProgress(100);

        console.log(`✅ Evaluation completed - Submission: ${submissionId}, User: ${userRegistrationId}, Contest: ${contestSlug}, Score: ${score}/${submission.totalQuestions}`);

        return {
            submissionId,
            score,
            totalQuestions: submission.totalQuestions,
            status: 'evaluated',
            contestSlug,
            userRegistrationId
        };

    } catch (error) {
        console.error(`❌ Evaluation failed for submission ${submissionId}:`, error);

        try {
            await Submission.findByIdAndUpdate(submissionId, {
                status: 'failed'
            });
        } catch (updateError) {
            console.error('Failed to update submission status to failed:', updateError);
        }

        throw error;
    }
}, {
    connection: { url: process.env.REDIS_URL },
    concurrency: 10,
    limiter: {
        max: 100,
        duration: 60000
    }
});



// Worker event handlers
evaluationWorker.on('completed', (job, returnValue) => {
  console.log(`✅ Job ${job.id} completed with result:`, returnValue);
});

evaluationWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

evaluationWorker.on('progress', (job, progress) => {
  console.log(`🔄 Job ${job.id} progress: ${progress}%`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('🔄 Shutting down evaluation worker...');
  await evaluationWorker.close();
  await evaluationQueue.close();
  await redisClient.quit();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);