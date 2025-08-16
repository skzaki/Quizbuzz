// controller/admin/contestController.js
import { Contest, Question } from "../../Models/DB.js";
import { questionsSchema } from "../../Models/zodSchmea.js";

/**
 * @desc    Create a new contest
 * @route   POST /api/admin/contests
 * @access  Admin
 */
export const createContest = async (req, res) => {
    try {
        // TODO: Validate request body before creating
        const contest = await Contest.create(req.body);
        return res.status(201).json({ message: "Contest created successfully", contest });
    } catch (err) {
        console.error("Error creating contest:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * @desc    Get details of a contest
 * @route   GET /api/admin/contests/:contestId
 * @access  Admin
 */
export const getContestDetails = async (req, res) => {
    try {
        const { contestId } = req.params;
        const contest = await Contest.findById(contestId);
        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }
        return res.json(contest);
    } catch (err) {
        console.error("Error fetching contest details:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * @desc    Update contest details
 * @route   PATCH /api/admin/contests/:contestId
 * @access  Admin
 */
export const updateContestDetails = async (req, res) => {
    try {
        const { contestId } = req.params;
        const contest = await Contest.findByIdAndUpdate(contestId, req.body, { new: true });
        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }
        return res.json({ message: "Contest updated successfully", contest });
    } catch (err) {
        console.error("Error updating contest:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// with Transcations for Prod
// export const addQuestionsToContest = async (req, res) => {
//     const { contestId, questions } = req.body;
//     console.log(req.params.contestId);
    
//     console.log(`ContestId: ${contestId}`);

    

//     const notAcceptedQues = [];
//     const acceptedQues = [];
    
//     // Validation checks
//     if (!contestId) {
//         return res.status(400).json({ message: "Provide the contest ID to add questions" });
//     }
    
//     if (!questions || !Array.isArray(questions)) {
//         return res.status(400).json({ message: "Questions must be provided as an array" });
//     }
    
//     if (questions.length === 0) {
//         return res.status(400).json({ message: "Enter at least one question to insert" });
//     }

//     try {
//         // Process each question
//         questions.forEach(question => {
//             const result = questionsSchema.safeParse(question);
            
//             if (!result.success) {
//                 notAcceptedQues.push({
//                     question,
//                     errors: result.error.errors
//                 });
//             } else {
//                 acceptedQues.push(question);
//             }
//         });

//         // Declare variables outside transaction scope
//         let insertedQuestions = [];
//         let insertedQuestionIds = [];

//         // Only proceed with transaction if there are accepted questions
//         if (acceptedQues.length > 0) {
//             const session = await mongoose.startSession();

//             try {
//                 await session.withTransaction(async () => {
//                     // Insert questions within transaction
//                     insertedQuestions = await Question.create(acceptedQues, { session, ordered:true });
//                     insertedQuestionIds = insertedQuestions.map(question => question._id);

//                     // Update contest within same transaction
//                     const updateResult = await Contest.findByIdAndUpdate( contestId, {
//                             $push: { 
//                                 QuestionBank: { 
//                                     $each: insertedQuestionIds 
//                                 } 
//                             }
//                         },
//                         { session }
//                     );

//                     if (!updateResult) {
//                         throw new Error('Contest not found');
//                     }
//                 });
//             } catch (error) {
//                 if (error.message === 'Contest not found') {
//                     return res.status(404).json({ 
//                         message: "Contest not found. Questions were not added." 
//                     });
//                 }
//                 throw error; // Re-throw other errors
//             } finally {
//                 await session.endSession();
//             }
//         }

//         // Send response with results
//         return res.status(200).json({
//             message: "Questions processed successfully",
//             summary: {
//                 total: questions.length,
//                 accepted: acceptedQues.length,
//                 rejected: notAcceptedQues.length
//             },
//             insertedQuestions,
//             insertedQuestionIds,
//             rejectedQuestions: notAcceptedQues
//         });

//     } catch (error) {
//         console.error(`ERROR: ${error.message}`);
//         return res.status(500).json({
//             message: "Internal Server Error"
//         });
//     }
// };


export const addQuestionsToContest = async (req, res) => {
    const { contestId, questions } = req.body;
    
    console.log(`contestId: ${contestId}`);

    const notAcceptedQues = [];
    const acceptedQues = [];
    
    // Validation checks
    if (!contestId) {
        return res.status(400).json({ message: "Provide the contest ID to add questions" });
    }
    
    if (!questions || !Array.isArray(questions)) {
        return res.status(400).json({ message: "Questions must be provided as an array" });
    }
    
    if (questions.length === 0) {
        return res.status(400).json({ message: "Enter at least one question to insert" });
    }

    try {
        // Process each question
        questions.forEach(question => {
            const result = questionsSchema.safeParse(question);
            
            if (!result.success) {
                notAcceptedQues.push({
                    question,
                    errors: result.error.errors
                });
            } else {
                acceptedQues.push(question);
            }
        });

        // Declare variables for results
        let insertedQuestions = [];
        let insertedQuestionIds = [];

        // Only proceed if there are accepted questions
        if (acceptedQues.length > 0) {
            try {
                // Insert questions first
                insertedQuestions = await Question.create(acceptedQues);
                insertedQuestionIds = insertedQuestions.map(question => question._id);

                // Check if contest exists and update it
                const updateResult = await Contest.findByIdAndUpdate(
                    contestId,
                    {
                        $push: { 
                            QuestionBank: { 
                                $each: insertedQuestionIds 
                            } 
                        }
                    }
                );

                if (!updateResult) {
                    // Contest not found - clean up inserted questions
                    await Question.deleteMany({ _id: { $in: insertedQuestionIds } });
                    return res.status(404).json({ 
                        message: "Contest not found. Questions were not added." 
                    });
                }
            } catch (error) {
                // If contest update fails, clean up inserted questions
                if (insertedQuestionIds.length > 0) {
                    await Question.deleteMany({ _id: { $in: insertedQuestionIds } });
                }
                throw error;
            }
        }

        // Send response with results
        return res.status(200).json({
            message: "Questions processed successfully",
            summary: {
                total: questions.length,
                accepted: acceptedQues.length,
                rejected: notAcceptedQues.length
            },
            insertedQuestions,
            rejectedQuestions: notAcceptedQues
        });

    } catch (error) {
        console.error(`ERROR: ${error.message}`);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};
/**
 * @desc    Soft delete a contest (mark as deleted)
 * @route   DELETE /api/admin/contests/:contestId
 * @access  Admin
 */
export const deleteContestDetails = async (req, res) => {
    try {
        const { contestId } = req.params;
        const contest = await Contest.findByIdAndUpdate(
            contestId,
            { isDeleted: true },
            { new: true }
        );
        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }
        return res.json({ message: "Contest deleted successfully", contest });
    } catch (err) {
        console.error("Error deleting contest:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * @desc    Get all contests (optionally include deleted)
 * @route   GET /api/admin/contests
 * @access  Admin
 */
export const allContests = async (req, res) => {
    try {
        const includeDeleted = req.query.includeDeleted === "true";
        const contests = await Contest.find(includeDeleted ? {} : { isDeleted: false });
        return res.json(contests);
    } catch (err) {
        console.error("Error fetching contests:", err);
        res.status(500).json({ message: "Server error" });
    }
};
