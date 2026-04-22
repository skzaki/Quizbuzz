import { Domain } from '../../Models/DB.js';

/**
 * @desc    Get all active domains
 * @route   GET /api/admin/domains
 * @access  Admin
 */
export const getAllDomains = async (req, res) => {
  try {
    const domains = await Domain.find({ isDeleted: false, isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .select('name key')
      .lean();

    return res.json({
      success: true,
      data: {
        domains: domains.map((domain) => ({
          id: domain._id,
          name: domain.name,
          key: domain.key
        }))
      }
    });
  } catch (error) {
    console.error('Get domains error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch domains'
      }
    });
  }
};
