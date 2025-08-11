// controller/admin/contestController.js
import { Contest } from "../../Models/DB.js";

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
