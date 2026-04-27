// worker/evaluationWorker.js

import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import { Contest, Question, Submission, connectDB } from '../Models/DB.js';
import redisClient from '../redis.js';
import { deleteUserState } from '../store/contestStateService.js';
import { evaluationQueue } from './../queue/submissionQueues.js';

dotenv.config();

await connectDB();

const resolveOptionText = (question, correctIndex) => {
  if (!question) {
    return '';
  }

  const option = Array.isArray(question.options) ? question.options[correctIndex] : null;

  if (option && typeof option === 'object') {
    return option.text ?? option.value ?? '';
  }

  if (typeof option === 'string') {
    return option;
  }

  return question.correctOptionText ?? '';
};

async function getCorrectAnswers({ contestId, contestSlug }) {
  if (contestId) {
    const answerKey = `contest:${contestId}:correct_answers`;
    const cachedAnswers = await redisClient.get(answerKey);

    if (cachedAnswers) {
      const answerMap = JSON.parse(cachedAnswers);
      const questionIds = Object.keys(answerMap);
      const questions = await Question.find({ _id: { $in: questionIds } })
        .select('_id options correctOptionText correctOptionIndex')
        .lean();

      return questions.map((question) => {
        const correctIndex = answerMap[question._id.toString()];
        return {
          questionId: question._id.toString(),
          correctAnswerIndex: correctIndex,
          correctAnswer: resolveOptionText(question, correctIndex)
        };
      });
    }
  }

  const legacyAnswerKey = `contest:${contestSlug}:correct_answers`;
  const legacyCachedAnswers = await redisClient.get(legacyAnswerKey);

  if (legacyCachedAnswers) {
    console.log(`📦 Retrieved legacy correct answers from Redis for contest: ${contestSlug}`);
    return JSON.parse(legacyCachedAnswers);
  }

  console.log(`⚠️ Redis lookup failed, fetching from database for contest: ${contestSlug}`);

  const contest = await Contest.findOne({ slug: contestSlug })
    .select('_id title questionBank QuestionBank');

  if (!contest) {
    throw new Error(`Contest ${contestSlug} not found in database`);
  }

  const questionIds = Array.isArray(contest.questionBank)
    ? contest.questionBank
    : Array.isArray(contest.QuestionBank)
      ? contest.QuestionBank
      : [];

  const questions = await Question.find({ _id: { $in: questionIds } })
    .select('_id options correctOptionText correctOptionIndex')
    .lean();

  const correctAnswers = questions.map((question) => ({
    questionId: question._id.toString(),
    correctAnswerIndex: question.correctOptionIndex,
    correctAnswer: resolveOptionText(question, question.correctOptionIndex)
  }));

  try {
    await redisClient.setEx(
      legacyAnswerKey,
      60 * 60,
      JSON.stringify(correctAnswers)
    );
    console.log(`💾 Re-stored correct answers in Redis for contest: ${contestSlug}`);
  } catch (redisError) {
    console.warn(`⚠️ Failed to store answers back to Redis: ${redisError.message}`);
  }

  return correctAnswers;
}

export const evaluationWorker = new Worker('contest-evaluation', async (job) => {
  const { submissionId, contestSlug, contestId, userRegistrationId } = job.data;

  try {
    console.log(`Processing evaluation for submission: ${submissionId}`);

    await job.updateProgress(10);

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    await job.updateProgress(25);

    const correctAnswers = await getCorrectAnswers({ contestId, contestSlug });

    await job.updateProgress(50);

    const userAnswersMap = new Map(
      submission.answers.map((answer) => [answer.questionId.toString(), answer])
    );

    let score = 0;
    const evaluatedAnswers = [];

    for (const q of correctAnswers) {
      const userAnswer = userAnswersMap.get(q.questionId.toString());

      if (userAnswer) {
        const isSkipped = !userAnswer.answer || userAnswer.answer.trim() === '';
        const isCorrect = q.correctAnswerIndex !== undefined
          ? Number(userAnswer.answerIndex) === Number(q.correctAnswerIndex)
          : userAnswer.answer === q.correctAnswer;

        let questionScore = 0;
        if (isSkipped) {
          questionScore = 0;
        } else if (isCorrect) {
          questionScore = 1;
        } else {
          questionScore = -0.25;
        }

        evaluatedAnswers.push({
          ...userAnswer.toObject(),
          isCorrect,
          correctAnswer: q.correctAnswer,
          questionScore
        });

        score += questionScore;
      } else {
        evaluatedAnswers.push({
          questionId: q.questionId,
          answer: '',
          correctAnswer: q.correctAnswer,
          answerIndex: null,
          isCorrect: false,
          questionScore: 0,
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
      3600,
      JSON.stringify(submissionStatus)
    );

    await job.updateProgress(95);

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

evaluationWorker.on('completed', (job, returnValue) => {
  console.log(`✅ Job ${job.id} completed with result:`, returnValue);
});

evaluationWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

evaluationWorker.on('progress', (job, progress) => {
  console.log(`🔄 Job ${job.id} progress: ${progress}%`);
});

const gracefulShutdown = async () => {
  console.log('🔄 Shutting down evaluation worker...');
  await evaluationWorker.close();
  await evaluationQueue.close();
  await redisClient.quit();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
