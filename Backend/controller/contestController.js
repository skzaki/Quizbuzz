import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import { Contest, Session, Submission, User } from '../Models/DB.js';
import { extractDeviceInfo, generateSessionId } from '../utils/sessionHelper.js';

export const validateCredentials = async (req, res) => {
  try {
    const { registrationId, phone, slug } = req.body;
    const { device, userAgent } = extractDeviceInfo(req);
    const ipAddress = req.ip;
    
    console.log(`${registrationId}: ${phone}: ${slug}`);


    // 1. Check if user exists and validate password
    const user = await User.findOne({ registrationId });
    
    if (!user) {
      return res.status(401).json({ message: 'No User Found, Check your email for the correct credentials' });
    }

    if (parseInt(phone) !== user.phone) return res.json({message: "The Register-ID does not match the Phone no, Please enter the same phone no used during the registration"});


    // 2. Check for existing active sessions
    const existingSession = await Session.findOne({
      userId: user._id,
      isActive: true
    });

    // 3. If exists, invalidate the old session
    if (existingSession) {
      await Session.findByIdAndUpdate(existingSession._id, {
        isActive: false,
        endedAt: new Date()
      });
    }

    // 4. Create new session
    const sessionId = generateSessionId(); // UUID or crypto.randomBytes
    const newSession = new Session({
        userId: user._id,
        sessionId,
        device,
        ipAddress,
        userAgent,
        isActive: true
    });

    await newSession.save();

    // 5. Generate JWT with sessionId
    const token = jwt.sign(
      {
        userId: user._id,
        sessionId: sessionId,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      contest: {
            id: "1",
            title: "QuizBuzz Demo",
            startTime: new Date(Date.now() + 30 * 60000),
            duration: 50,
            participants: 123
        }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
  const { contestId } = req.params;
  // TODO: fetch from DB
  return res.json({
    contestId,
    questions: [
      { id: 1, question: "Sample Q?", options: ["A", "B", "C", "D"] }
    ]
  });
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
