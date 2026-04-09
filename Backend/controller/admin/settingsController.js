import { Settings } from "../../Models/DB.js";

/**
 * @desc    Get global settings
 * @route   GET /api/admin/settings
 * @access  Admin
 */
export const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        
        if (!settings) {
            // Create default settings if they don't exist
            settings = await Settings.create({});
        }

        res.json({
            success: true,
            data: settings,
            message: "Settings retrieved successfully"
        });
    } catch (err) {
        console.error('Get settings error:', err);
        res.status(500).json({ 
            success: false, 
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: err.message 
            }
        });
    }
};

/**
 * @desc    Update global settings
 * @route   PUT /api/admin/settings
 * @access  Admin
 */
export const updateSettings = async (req, res) => {
    try {
        const updateData = req.body;
        
        // Find existing settings or create new one (upsert: true with empty filter)
        const settings = await Settings.findOneAndUpdate(
            {}, 
            { $set: updateData }, 
            { new: true, upsert: true, runValidators: true }
        );

        res.json({ 
            success: true, 
            data: settings,
            message: "Settings updated successfully" 
        });
    } catch (err) {
        console.error('Update settings error:', err);
        res.status(500).json({ 
            success: false, 
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: err.message 
            }
        });
    }
};
