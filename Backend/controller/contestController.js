import PDFDocument from "pdfkit";

export const validateCredentials = async (req, res) => {
  const { registeredId, phone } = req.body;
  // TODO: DB lookup for contest & participant validation
  return res.json({
    contest: {
      id: "1",
      title: "QuizBuzz Demo",
      startTime: new Date(Date.now() + 30 * 60000),
      duration: 50,
      participants: 123
    }
  });
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
