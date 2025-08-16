import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import { Contest, Session, Submission, User } from '../Models/DB.js';
import { validateCredentialsSchema } from '../Models/zodSchmea.js';
import { saveSession } from "../service/sessionService.js";
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
      { userId: user._id, sessionId, email: user.email },
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
    const questions = [];
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
  const { contestId } = req.params;
  const { answers, flaggedQuestions, timeSpent } = req.body;
  // TODO: Save to DB
  return res.json({ message: "Contest submitted", contestId });
};

export const getContestResults = async (req, res) => {
    try {
        const { contestId } = req.params;
        const userId = req.user.id; // Extracted from auth middleware

        // Fetch submission from DB
        const submission = await Submission.findOne({ contestId, userId }).populate("questions");

        if (!submission) {
            return res.status(404).json({ message: "No submission found for this contest" });
        }

        // Build marksheet
        const marksheet = submission.questions.map(q => ({
            questionId: q._id,
            question: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            userAnswer: submission.answers[q._id] || null,
            status:
            submission.answers[q._id] === q.correctAnswer
                ? "correct"
                : submission.answers[q._id]
                ? "incorrect"
                : "skipped"
        }));

        res.json({
            contestId,
            score: submission.score,
            total: submission.questions.length,
            correct: submission.correctCount,
            incorrect: submission.incorrectCount,
            skipped: submission.skippedCount,
            marksheet
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
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
