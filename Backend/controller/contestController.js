import jwt from "jsonwebtoken";
import mongoose from 'mongoose';
import PDFDocument from "pdfkit";
import { Contest, Session, Submission, User } from '../Models/DB.js';
import { validateCredentialsSchema } from '../Models/zodSchmea.js';
import { evaluationQueue } from '../queue/submissionQueues.js';
import redisClient from "../redis.js";
import { getUserState } from "../store/contestStateService.js";
import { saveSession } from "../store/sessionService.js";
import { extractDeviceInfo } from '../utils/sessionHelper.js';




export const validateCredentials = async (req, res) => {
  try {
    // 1 Validate input
    const parsed = validateCredentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.format() });
    }
    const { registrationId, phone, slug } = parsed.data;

    const { device, userAgent } = extractDeviceInfo(req);
    const ipAddress = req.ip;

    // 2 Check if user exists
    const user = await User.findOne({ registrationId });
    if (!user) {
      return res
        .status(401)
        .json({ message: "No User Found, Check your email for the correct credentials" });
    }

    if (parseInt(phone) !== user.phone) {
      return res.json({
        message:
          "The Register-ID does not match the Phone no, Please enter the same phone no used during the registration",
      });
    }

    // 3 Invalidate existing active session in DB
    await Session.updateMany(
      { userId: user._id, isActive: true },
      { $set: { isActive: false, endedAt: new Date() } }
    );

    // 4 Create new session ID
    const sessionId = crypto.randomUUID();

    // 5 Save to MongoDB
    const newSession = new Session({
      userId: user._id,
      sessionId,
      device,
      ipAddress,
      userAgent,
      isActive: true,
      lastActivity: new Date(),
    });
    await newSession.save();

    // 6 Save to Redis (24 hours TTL)
    await saveSession(sessionId, {
      userId: user._id.toString(),
      ipAddress,
      userAgent,
      isActive: true,
      lastActivity: new Date().toISOString(),
    }, 60 * 60 * 24);

    // 7 Generate JWT
    const token = jwt.sign(
      { userId: user._id, sessionId, email: user.email, userName: `${user.firstName} ${user.lastName}` },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      userInfo: {
        registrationId: user.registrationId,
        _id: user._id
    },
      contestInfo: {
        id: "1",
        slug: "quizbuzz-3",
        title: "QuizBuzz Demo",
        startTime: new Date(Date.now() + 2 * 60000),
        duration: 50,
        participants: 123,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const getContestBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const contest = await Contest.findOne({ slug, isDeleted: false });
        if (!contest) return res.status(404).json({ message: "Contest not found" });
        res.json(contest);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

export const getContestQuestions = async (req, res) => {
    console.table(req.user);
    const { contestSlug } = req.params;
    
    if(!contestSlug) return res.status(400).json({ message: "provide the contest slug"});

    try {
        const Ques = await Contest.find(
            {slug: contestSlug },
            { QuestionBank: 1, _id:0 }
        ).populate("QuestionBank", "questionText options");
        
        return res.json({
            message: "Fetch Ques success",
            questions: Ques[0].QuestionBank
        })

    } catch(error) {
        console.log(`ERROR: ${error.message}`);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        })
    }
  
};

export const submitContest = async (req, res) => {
    const { contestSlug, userRegistrationId } = req.body;

    console.log(`IN submitContest: ${contestSlug} | ${userRegistrationId}`);
    if(!contestSlug || !userRegistrationId) {
        return res.status(400).json( { message: "ContestSlug and userRegistrationId are required "});
    }

    try {
            // Find contest and user by slug/registrationId
        const [contest, user] = await Promise.all([
            Contest.findOne({ slug: contestSlug }).select('_id slug title'),
            User.findOne({ registrationId: userRegistrationId }).select('_id registrationId name')
        ]);

        if(!contest) return res.status(404).json({ message: `Contest not found: ${contestSlug}`});

        if(!user) return res.status(404).json({ message: `User not found: ${userRegistrationId}`});

        console.log(`contestid: ${contest._id}`);

        const existingSubmission = await Submission.findOne({
            userId: user._id,
            contestId: contest._id
        });

        if(existingSubmission) {
            return res.status(400).json({
                message: 'Already submitted for this contest',
                submissionId: existingSubmission._id,
            });
        }

        const userState = await getUserState(contestSlug, userRegistrationId);

        if(!userState || !userState.answers || userState.answers.length === 0) {
            return res.status(400).json({ message: "No answers found. Please answer question first."});
        }

        // if (userState.answers.some(answer => answer.answerIndex === "" || answer.answerIndex === undefined || answer.answerIndex === null)) {
        //     return res.status(400).json({ error: 'Please answer all questions before submitting.' });
        // }

        console.log('New Submisssion');
        const submission = new Submission({
            userId: user._id,
            contestId: contest._id,
            answers: userState.answers.map(answer => ({
                questionId: new mongoose.Types.ObjectId(answer.questionId),
                answer: answer.answer || '',
                answerIndex: answer.answerIndex,
                submittedAt: answer.submittedAt || new Date(),
                isCorrect: false
            })),
            score: 0,
            totalQuestions: userState.answers.length,
            status: 'submitted',
        });
        // save submission to DB
        await submission.save();
        console.log('Saved')
        console.log('create job');
        // Create a job & add to Queue
        const job = await evaluationQueue.add('evaluate-submission', {
            submissionId: submission._id.toString(),
            contestSlug,
            userRegistrationId,
            contestId: contest._id.toString(),
            userId: user._id.toString(),
        }, {
            priority: 1,
            delay: 0
        });

        console.log(`Contest submitted - User: ${userRegistrationId}, Contest: ${contestSlug}`);

        // Return response with submissionId
        return res.json({
            message: "Contest submitted successfully",
            submissionId: submission._id,
            status: 'submitted',
            jobId: job.id,
            contestSlug,
            userRegistrationId
        });

    } catch (error) {
        console.log(`EEROR: ${error.message}`);
        
        return res.status(500).json({
            message:" Internal serverS ERRROR"
        });

    }
};

export const getSubmissionStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    console.log("In getSubmissionStatus:");
    
    console.log(`submissionId: ${submissionId}`);
    

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ error: 'Invalid submission ID' });
    }

    // Check Redis cache first
    const cachedStatus = await redis.get(`submission:${submissionId}:status`);
    if (cachedStatus) {
      return res.json(JSON.parse(cachedStatus));
    }

    // Fallback to database
    const submission = await Submission.findById(submissionId)
      .select('status score totalQuestions createdAt updatedAt')
      .lean();

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const response = {
      submissionId,
      status: submission.status,
      ...(submission.status === 'evaluated' && {
        score: submission.score,
        totalQuestions: submission.totalQuestions,
        percentage: Math.round((submission.score / submission.totalQuestions) * 100)
      }),
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt
    };

    // Cache for future requests
    const cacheTime = submission.status === 'evaluated' ? 3600 : 30;
    await redisClient.setEx(
      `submission:${submissionId}:status`,
      cacheTime,
      JSON.stringify(response)
    );

    res.json(response);

  } catch (error) {
    console.error('❌ Get submission status error:', error);
    res.status(500).json({ error: 'Failed to fetch submission status' });
  }
};

export const getSubmissionResult = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.userId; // Assuming user ID comes from auth middleware

    
    console.log("In getSubmissionResult:")
    console.log(`submissionId: ${submissionId}`);
    console.log(`UserId: ${userId}`);
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ error: 'Invalid submission ID' });
    }

    // Check Redis cache first for complete results
    const cachedResults = await redisClient.get(`submission:${submissionId}:results`);
    if (cachedResults) {
        console.log(`cachedResults`);
        console.table(cachedResults);
      return res.json(JSON.parse(cachedResults));
    }

    // Fetch submission with user, contest, and populate question details for answers
    const submission = await Submission.findById(submissionId)
      .populate('userId', 'name email')
      .populate('contestId', 'title')
      .populate('answers.questionId') // Populate question details
      .lean();

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    // Check if user has permission to view this submission
    if (submission.userId._id.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this submission' });
    }

    // If submission is not evaluated yet, return status info
    if (submission.status === 'submitted') {
      const statusResponse = {
        submissionId,
        status: submission.status,
        message: 'Your submission is being evaluated. Please wait...',
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt
      };

      // Cache status for shorter duration
      await redisClient.setEx(
        `submission:${submissionId}:results`,
        30, // 30 seconds for non-evaluated submissions
        JSON.stringify(statusResponse)
      );

      return res.json(statusResponse);
    }

    // Build detailed results with question-wise breakdown
    const questionResults = submission.answers.map((answer, index) => {
      const question = answer.questionId;
      
      return {
        questionNo: index + 1,
        questionId: question?._id,
        questionText: question?.questionText || `Question ${index + 1}`,
        questionType: question?.type || 'multiple_choice',
        userAnswer: answer.answer,
        userAnswerIndex: answer.answerIndex,
        correctAnswer: question?.correctAnswer,
        correctAnswerIndex: question?.correctAnswerIndex,
        isCorrect: answer.isCorrect,
        points: answer.isCorrect ? (question?.points || 1) : 0,
        maxPoints: question?.points || 1,
        explanation: question?.explanation || null,
        options: question?.options || null, // For multiple choice questions
        difficulty: question?.difficulty || 'medium',
        topic: question?.topic || null,
        submittedAt: answer.submittedAt
      };
    });

    // Calculate additional statistics
    const totalQuestions = submission.totalQuestions || submission.answers.length;
    const correctAnswers = submission.answers.filter(ans => ans.isCorrect).length;
    const incorrectAnswers = totalQuestions - correctAnswers;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    
    // Topic-wise breakdown
    const topicStats = {};
    questionResults.forEach(result => {
      if (result.topic) {
        if (!topicStats[result.topic]) {
          topicStats[result.topic] = { correct: 0, total: 0 };
        }
        topicStats[result.topic].total++;
        if (result.isCorrect) {
          topicStats[result.topic].correct++;
        }
      }
    });

    // Difficulty-wise breakdown
    const difficultyStats = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 }
    };
    
    questionResults.forEach(result => {
      const difficulty = result.difficulty;
      difficultyStats[difficulty].total++;
      if (result.isCorrect) {
        difficultyStats[difficulty].correct++;
      }
    });

    const response = {
      submissionId,
      status: submission.status,
      userName: `${submission.userId.firstName} ${submission.userId.LastName}`,
      userEmail: submission.userId.email,
      contestTitle: submission.contestId.title,
      
      // Overall scores
      score: submission.score,
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      percentage,
      totalPoints: submission.totalPoints || submission.score,
      maxPossiblePoints: questionResults.reduce((sum, q) => sum + q.maxPoints, 0),
      
      // Timing information
      submittedAt: submission.createdAt,
      evaluatedAt: submission.updatedAt,
      
      // Question-wise results
      questions: questionResults,
      
      // Analytics
      statistics: {
        topicWise: Object.entries(topicStats).map(([topic, stats]) => ({
          topic,
          correct: stats.correct,
          total: stats.total,
          percentage: Math.round((stats.correct / stats.total) * 100)
        })),
        difficultyWise: Object.entries(difficultyStats).map(([difficulty, stats]) => ({
          difficulty,
          correct: stats.correct,
          total: stats.total,
          percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
        })).filter(stat => stat.total > 0),
        averageTimePerQuestion: null // Not available in current schema
      },
      
      // Performance insights
      insights: {
        strongTopics: Object.entries(topicStats)
          .filter(([_, stats]) => stats.correct / stats.total >= 0.8 && stats.total >= 3)
          .map(([topic]) => topic),
        weakTopics: Object.entries(topicStats)
          .filter(([_, stats]) => stats.correct / stats.total < 0.5 && stats.total >= 3)
          .map(([topic]) => topic),
        grade: getGrade(percentage),
        passed: percentage >= 60 // Assuming 60% is passing
      },
      
      // Timestamps
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt
    };

    // Cache the complete results for longer duration since they won't change
    await redisClient.setEx(
      `submission:${submissionId}:results`,
      3600, // 1 hour
      JSON.stringify(response)
    );

    res.json(response);

  } catch (error) {
    console.error('❌ Get submission results error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch submission results',
      message: error.message 
    });
  }
};

// Helper function to determine grade
const getGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'B+';
  if (percentage >= 75) return 'B';
  if (percentage >= 70) return 'C+';
  if (percentage >= 65) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};

export const startContest = async (req, res) => {
  return res.json({ message: "Contest started" });
};

export const endContest = async (req, res) => {
  return res.json({ message: "Contest ended" });
};


export const getContestCertificate = async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user.id;

    const submission = await Submission.findOne({ contestId, userId }).populate("contest user");

    if (!submission) {
      return res.status(404).json({ message: "No submission found" });
    }

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificate-${contestId}.pdf"`
    );

    doc.fontSize(24).text("Certificate of Participation", { align: "center" });
    doc.moveDown();
    doc.fontSize(16).text(`This is to certify that ${submission.user.name}`, { align: "center" });
    doc.text(`participated in the contest "${submission.contest.title}".`, { align: "center" });
    doc.moveDown();
    doc.text(`Score: ${submission.score}`, { align: "center" });

    doc.end();
    doc.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
