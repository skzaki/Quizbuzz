import crypto from 'crypto';
import jwt from "jsonwebtoken";
import mongoose from 'mongoose';
import PDFDocument from "pdfkit";
import { Contest, Question, Session, Submission, User } from '../Models/DB.js';
import { validateCredentialsSchema } from '../Models/zodSchema.js';
import { areAllJobsCompleted, evaluationQueue } from '../queue/submissionQueues.js';
import redisClient from "../redis.js";
import * as contestService from "../services/contest.service.js";
import { getUserState } from "../store/contestStateService.js";
import { saveSession } from "../store/sessionService.js";
import { extractDeviceInfo } from '../utils/sessionHelper.js';
import {
  calculateDifficultyQuestionCounts,
  calculateQuestionCountsFromDistribution,
  normalizeDomainDistribution
} from '../utils/domainDistribution.js';

const sendServiceError = (res, error, fallbackMessage = "Internal server error") => {
  if (error?.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message,
      code: error.code
    });
  }

  console.error(error);
  return res.status(500).json({
    message: fallbackMessage,
    error: process.env.NODE_ENV === 'development' ? error?.message : undefined
  });
};



export const validateCredentials = async (req, res) => {
  try {
    // Validate input
    const parsed = validateCredentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        message: "Invalid input data",
        errors: parsed.error.format() 
      });
    }
    // F-05: Removed hardcoded slug default 'quizbuzz-3' — slug is now required
    const { registrationId, phone, slug } = parsed.data;
    if (!slug) {
      return res.status(400).json({ message: "Contest slug is required" });
    }
    const { device, userAgent } = extractDeviceInfo(req);
    const ipAddress = req.ip;

    console.log(`slug:${slug}`);
    console.log(`registrationId: ${registrationId} | phone: ${phone}`);
    
    // Check if contest exists
    const contest = await contestService.getBySlug(slug);
    if (!contest) {
      return res.status(404).json({ 
        message: "Contest not found. Please check the contest link or contact support." 
      });
    }

    // Check if user exists
    const user = await User.findOne({ registrationId, isDeleted: false });
    if (!user) {
      return res.status(401).json({ 
        message: "No user found. Please check your email for the correct credentials." 
      });
    }

    // Verify phone number matches
    if (phone.toString().trim() !== user.phone.toString().trim()) {
      return res.status(400).json({
        message: "Registration ID does not match the phone number. Please enter the same phone number used during registration."
      });
    }

    // If no active session exists, create new session
    const sessionId = crypto.randomUUID();

    // Save to MongoDB
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

    // Save to Redis (24 hours TTL)
    await saveSession(sessionId, {
      userId: user._id.toString(),
      ipAddress,
      userAgent,
      isActive: true,
      lastActivity: new Date().toISOString(),
    }, 60 * 60 * 24);

  const token = jwt.sign(
      { 
        userId: user._id, 
        sessionId, 
        role: "user",
        email: user.email, 
        userName: `${user.firstName} ${user.lastName}`,
        contestId: contest._id 
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Contest response data
    const contestInfo = {
      id: contest._id,
      slug: contest.slug,
      title: contest.title,
      description: contest.description,
      details: contest.details,
      topics: contest.topics,
      domainDistribution: contest.domainDistribution || [],
      rules: contest.rules,
      registerFee: contest.registerFee,
      duration: contest.duration,
      cutOff: contest.cutOff,
      startTime: contest.startTime,
      deadline: contest.deadline,
      participants: contest.participants?.length || 0,
      prizes: contest.prizes,
      totalQuestions: contest.questionBank?.length || contest.QuestionBank?.length || 0
    };

    // Response
    res.json({
      message: "Login successful. Welcome to the contest!",
      token,
      userInfo: {
        registrationId: user.registrationId,
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      contestInfo
    });
    
  } catch (error) {
    return sendServiceError(res, error, "Internal server error. Please try again later.");
  }
};


export const getContestBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
    const contest = await contestService.getBySlug(slug);
        if (!contest) return res.status(404).json({ message: "Contest not found" });
        res.json(contest);
    } catch (err) {
      return sendServiceError(res, err, "Server error");
    }
};

export const getContestQuestions = async (req, res) => {
    try {
      const { contestSlug } = req.params;
      if (!contestSlug) {
        return res.status(400).json({ message: "provide the contest slug" });
      }

      const result = await contestService.getContestQuestions(contestSlug);
      return res.json(result);
    } catch (error) {
      return sendServiceError(res, error, "Internal server error");
    }

    const { contestSlug } = req.params;
    
    if(!contestSlug) return res.status(400).json({ message: "provide the contest slug"});

    try {
        const contest = await Contest.findOne({ slug: contestSlug, isDeleted: false });
        if (!contest) return res.status(404).json({ message: "Contest not found" });

      const selectedDomains = Array.isArray(contest.topics) ? contest.topics : [];
      if (selectedDomains.length === 0) {
        return res.status(400).json({ message: "No domains configured for this contest" });
      }

      const totalQuestions = contest.QuestionBank?.length || 20;
      const normalizedDistribution = normalizeDomainDistribution(
        selectedDomains,
        contest.domainDistribution || []
      );
      const domainQuestionCounts = calculateQuestionCountsFromDistribution(
        totalQuestions,
        normalizedDistribution
      );

      const pickedQuestions = [];
      const pickedIds = new Set();
      const fetchedCountByDomain = {};
      const fetchedCountByDomainDifficulty = {};

      const initializeDomainCounters = (domain) => {
        if (!fetchedCountByDomain[domain]) {
          fetchedCountByDomain[domain] = 0;
        }

        if (!fetchedCountByDomainDifficulty[domain]) {
          fetchedCountByDomainDifficulty[domain] = {
            easy: 0,
            medium: 0,
            hard: 0
          };
        }
      };

      const appendQuestion = (question) => {
        const questionId = question?._id?.toString();
        if (!questionId || pickedIds.has(questionId)) return;

        pickedIds.add(questionId);
        pickedQuestions.push(question);

        const domain = question.domain;
        const difficulty = question.difficulty;

        initializeDomainCounters(domain);
        fetchedCountByDomain[domain] += 1;

        if (['easy', 'medium', 'hard'].includes(difficulty)) {
          fetchedCountByDomainDifficulty[domain][difficulty] += 1;
        }
      };

      for (const domainConfig of domainQuestionCounts) {
        const domain = domainConfig.name;
        initializeDomainCounters(domain);

        const difficultyPlan = calculateDifficultyQuestionCounts(
          domainConfig.questionCount,
          domainConfig.difficulty
        );

        for (const difficultyConfig of difficultyPlan) {
          const requestedCount = difficultyConfig.questionCount;

          if (requestedCount <= 0) {
            continue;
          }

          const match = {
            domain,
            difficulty: difficultyConfig.difficulty,
            isDeleted: false
          };

          if (pickedIds.size > 0) {
            match._id = {
              $nin: [...pickedIds].map((id) => new mongoose.Types.ObjectId(id))
            };
          }

          const difficultyQuestions = await Question.aggregate([
            { $match: match },
            { $sample: { size: requestedCount } },
            { $project: { questionText: 1, options: 1, _id: 1, domain: 1, difficulty: 1 } }
          ]);

          difficultyQuestions.forEach(appendQuestion);
        }

        const domainShortfall = domainConfig.questionCount - (fetchedCountByDomain[domain] || 0);

        if (domainShortfall > 0) {
          const domainFallbackMatch = {
            domain,
            isDeleted: false
          };

          if (pickedIds.size > 0) {
            domainFallbackMatch._id = {
              $nin: [...pickedIds].map((id) => new mongoose.Types.ObjectId(id))
            };
          }

          const domainFallbackQuestions = await Question.aggregate([
            { $match: domainFallbackMatch },
            { $sample: { size: domainShortfall } },
            { $project: { questionText: 1, options: 1, _id: 1, domain: 1, difficulty: 1 } }
          ]);

          domainFallbackQuestions.forEach(appendQuestion);
        }
      }

      const shortfall = totalQuestions - pickedQuestions.length;

      if (shortfall > 0) {
        const fallbackMatch = {
          domain: { $in: selectedDomains },
          isDeleted: false
        };

        if (pickedIds.size > 0) {
          fallbackMatch._id = {
            $nin: [...pickedIds].map((id) => new mongoose.Types.ObjectId(id))
          };
        }

        const fallbackQuestions = await Question.aggregate([
          { $match: fallbackMatch },
          { $sample: { size: shortfall } },
          { $project: { questionText: 1, options: 1, _id: 1, domain: 1, difficulty: 1 } }
        ]);

        fallbackQuestions.forEach(appendQuestion);
      }

      const questions = pickedQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, totalQuestions);

      const domainSummary = domainQuestionCounts.map((item) => ({
        ...item,
        fetchedCount: fetchedCountByDomain[item.name] || 0,
        difficultyQuestionCounts: calculateDifficultyQuestionCounts(
          item.questionCount,
          item.difficulty
        ).map((difficultyItem) => ({
          ...difficultyItem,
          fetchedCount: fetchedCountByDomainDifficulty[item.name]?.[difficultyItem.difficulty] || 0
        }))
      }));
        
        return res.json({
            message: "Fetch Ques success",
            questions: questions,
        quesCount: questions.length,
        requestedQuestionCount: totalQuestions,
        domainDistribution: normalizedDistribution,
        domainQuestionCounts: domainSummary
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
  try {
    const contestSlug = req.params.contestSlug;
    const { userRegistrationId } = req.body;

    if(!contestSlug || !userRegistrationId) {
      return res.status(400).json({ message: "ContestSlug and userRegistrationId are required "});
    }

    const [contest, user] = await Promise.all([
      contestService.getBySlug(contestSlug),
      User.findOne({ registrationId: userRegistrationId }).select('_id registrationId name')
    ]);

    if(!contest) return res.status(404).json({ message: `Contest not found: ${contestSlug}`});
    if(!user) return res.status(404).json({ message: `User not found: ${userRegistrationId}`});

    const userState = await getUserState(contestSlug, userRegistrationId);

    if(!userState || !userState.answers || userState.answers.length === 0) {
      return res.status(400).json({ message: "No answers found. Please answer question first."});
    }

    const { submissionId, status } = await contestService.submitContest(
      contestSlug,
      user._id,
      userState.answers
    );

    return res.json({
      message: "Contest submitted successfully",
      submissionId,
      status,
      contestSlug,
      userRegistrationId
    });
  } catch (error) {
    return sendServiceError(res, error, "Internal Server Error");
  }

     
    // Read contestSlug from URL param, userRegistrationId from body
    const contestSlug = req.params.contestSlug;
    const { userRegistrationId } = req.body;
    console.log(`IN submitContest: ${contestSlug} | ${userRegistrationId}`);

    if(!contestSlug || !userRegistrationId) {
        return res.status(400).json( { message: "ContestSlug and userRegistrationId are required "});
    }

    try {
            // Find contest and user by slug/registrationId
        const [contest, user] = await Promise.all([
          contestService.getBySlug(contestSlug),
          User.findOne({ registrationId: userRegistrationId }).select('_id registrationId name')
        ]);

        if(!contest) return res.status(404).json({ message: `Contest not found: ${contestSlug}`});

        if(!user) return res.status(404).json({ message: `User not found: ${userRegistrationId}`});

        console.log(`contestid: ${contest._id}`);

        const userState = await getUserState(contestSlug, userRegistrationId);

        if(!userState || !userState.answers || userState.answers.length === 0) {
            return res.status(400).json({ message: "No answers found. Please answer question first."});
        }

        const { submissionId, status } = await contestService.submitContest(
          contestSlug,
          user._id,
          userState.answers
        );

        console.log(`Contest submitted - User: ${userRegistrationId}, Contest: ${contestSlug}`);

        // Return response with submissionId
        return res.json({
            message: "Contest submitted successfully",
          submissionId,
          status,
            contestSlug,
            userRegistrationId
        });

    } catch (error) {
        // F-51: Fixed typos in error messages
        console.error(`ERROR: ${error.message}`);
        
        return res.status(500).json({
            message: "Internal Server Error"
        });

    }
};

export const getSubmissionStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const response = await contestService.getSubmissionStatus(submissionId);
    return res.json(response);
  } catch (error) {
    return sendServiceError(res, error, 'Failed to fetch submission status');
  }

  try {
    const { submissionId } = req.params;
    
    console.log("In getSubmissionStatus:");
    
    console.log(`submissionId: ${submissionId}`);
    

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ error: 'Invalid submission ID' });
    }

    // Check Redis cache first
    const cachedStatus = await redisClient.get(`submission:${submissionId}:status`);
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
    const userId = req.user.userId;
    const response = await contestService.getSubmissionResult(submissionId, userId);
    return res.json(response);
  } catch (error) {
    return sendServiceError(res, error, 'Failed to fetch submission results');
  }

  try {
    console.log(`In getSubmissionResult:`);  
    const { submissionId } = req.params;
    const userId = req.user.userId; 
    
    console.log("In getSubmissionResult:")
    console.log(`submissionId: ${submissionId}`);
    console.log(`UserId: ${userId}`);
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ error: 'Invalid submission ID' });
    }

    // Check Redis cache first for complete results
    const cachedResults = await redisClient.get(`submission:${submissionId}:results`);
    if (cachedResults) {
        console.log("From CachedResults");
      return res.json(JSON.parse(cachedResults));
    }

    // Fetch submission with user, contest, and populate question details for answers
    const submission = await Submission.findById(submissionId)
      .populate('userId', 'firstName lastName email')
      .populate('contestId', '_id title startTime')
      .populate('answers.questionId')
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
        contestId: submission.contestId?._id,
        userId: submission.userId?._id,
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
        correctAnswer: answer?.correctAnswer,
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
      contestId: submission.contestId._id,
      contestStartTime: submission.contestId.startTime,
      status: submission.status,
      userName: `${submission.userId.firstName} ${submission.userId.lastName}`,
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

export const getContestLeaderboard = async (req, res) => {
  try {
    const contestId = new mongoose.Types.ObjectId(req.params.contestId);

    const allDone = await areAllJobsCompleted();

    if(!allDone) {
      return res.json({ 
        success: false,
        message: "The Quiz or Evaluation is still under processing" 
      }); 
    }
        
    if(!contestId) {
      return res.status(400).json({ 
        success: false, 
        message: "Contest ID needed"
      });
    }

    const response = await contestService.getContestLeaderboard(contestId);
    return res.json(response);
  } catch(error) {
    return sendServiceError(res, error, "Error fetching the LeaderBoard");
  }

    try {
        const contestId = new mongoose.Types.ObjectId(req.params.contestId);
        console.log('In getContestLeaderboard');
        console.log(`BE: ${contestId}`);
        
        // F-04: Added await — was missing and always returned truthy Promise
        const allDone = await areAllJobsCompleted();

        if(!allDone) {
            return res.json({ 
                success: false,
                message: "The Quiz or Evaluation is still under processing" 
            }); 
        }
        
        if(!contestId) {
            return res.status(400).json({ 
                success: false, 
                message: "Contest ID needed"
            });
        }

        // F-34: Use contest's cutOff instead of hardcoded 50
        const leaderboardContest = await Contest.findById(contestId).select('cutOff');
        const scoreThreshold = leaderboardContest?.cutOff ?? 0;
        const submissions = await Submission.find({ 
            contestId, 
            score: { $gte: scoreThreshold }
        })
        .select('_id userId score totalQuestions createdAt updatedAt')
        .populate('userId', 'registrationId firstName lastName college')
        .populate('contestId', 'startTime'); // Fixed: correct field name and syntax

        if(!submissions || submissions.length === 0) {
            console.log(`No submissions found for contest ${contestId}`);
            return res.json({ 
                success: true,
                submissions: [],
                message: "No submissions found for this contest" 
            });
        }

        // Sort by score (descending), then by createdAt (ascending for same scores)
        const sortedData = submissions.sort((a, b) => {
            if(b.score !== a.score) {
                return b.score - a.score;
            }
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        // Get top 25 submissions
        const top25 = sortedData.slice(0, 25);

        return res.json({
            success: true,
            submissions: top25
        });

    } catch(err) {
        console.error(`ERROR in getContestLeaderboard: ${err.message}`);
        return res.status(500).json({
            success: false,
            message: "Error fetching the LeaderBoard",
            error: err.message
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
    const { contestSlug } = req.params;
    const userId = req.user.userId;
    const response = await contestService.getContestCertificate(contestSlug, userId);

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificate-${contestSlug}.pdf"`
    );

    doc.fontSize(24).text("Certificate of Participation", { align: "center" });
    doc.moveDown();
    doc.fontSize(16).text(`This is to certify that ${response.participantName}`, { align: "center" });
    doc.text(`participated in the contest "${response.contestTitle}".`, { align: "center" });
    doc.moveDown();
    doc.text(`Score: ${response.score}`, { align: "center" });

    doc.pipe(res);
    doc.end();
    return;
  } catch (error) {
    return sendServiceError(res, error, "Server error");
  }

  try {
    const { contestSlug } = req.params;
    const userId = req.user.userId;  // fixed: was req.user.id

    // Find submission by contestSlug (look up contest first) and userId
    const contest = await Contest.findOne({ slug: contestSlug, isDeleted: false });
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    const submission = await Submission.findOne({ contestId: contest._id, userId })
      .populate("contestId", "title")
      .populate("userId", "firstName lastName");

    if (!submission) {
      return res.status(404).json({ message: "No submission found" });
    }

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificate-${contestSlug}.pdf"`
    );

    const participantName = `${submission.userId.firstName} ${submission.userId.lastName}`;
    const contestTitle = submission.contestId.title;

    doc.fontSize(24).text("Certificate of Participation", { align: "center" });
    doc.moveDown();
    doc.fontSize(16).text(`This is to certify that ${participantName}`, { align: "center" });
    doc.text(`participated in the contest "${contestTitle}".`, { align: "center" });
    doc.moveDown();
    doc.text(`Score: ${submission.score}`, { align: "center" });

    doc.pipe(res);
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
