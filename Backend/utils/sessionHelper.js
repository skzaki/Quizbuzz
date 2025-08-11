import crypto from "crypto";

export const generateSessionId = () => {
    return crypto.randomBytes(32).toString('hex');
};

export const extractDeviceInfo = (req) => {
    const userAgent = req.get('User-Agent') || '';
    let device = 'Unknown';

    if (userAgent.includes('Mobile')) device = 'Mobile';
    else if (userAgent.includes('Tablet')) device = 'Tablet';
    else device = 'Desktop';

    return { device, userAgent };
};