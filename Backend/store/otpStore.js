import redisClient from "../redis.js";



export async function saveOtp(phone, otp) {
    // store the OTP aganist the phone 
    try {
        const key = `otp:${phone}`;
        await redisClient.setEx(key, 300, otp);
        return true;
    } catch (error) {
        console.error("Error storing OTP:", error);
        return false;
    }
    
}

export async function verifyAndDeleteOtp(phone, inputOtp) {
    try {

        const key = `otp:${phone}`;
        const storedOtp = await redisClient.get(key);

        if(!storedOtp) {
            return { success: false, message: "OTP not found or expired" };
        }

        if( storedOtp === inputOtp) {
            await redisClient.del(key);
            return { success: true, message: "OTP  verified successfully" }
        } else {
            return { success: false, message: "Invalid OTP" }
        }

    } catch (error) {
        console.error(`Error verifying OTP: ${error.message}`);
        return {
            success: false,
            message: "Error verifying OTP",
        }
    }
}