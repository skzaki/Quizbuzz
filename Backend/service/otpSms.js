async function sendOtpSms(mobile, otp) {
    try {
        const SEND_OTP_QUIZBUZZ_TEMPLATE_MESSAGE = " is your verification OTP for Quizbuzz registration. Please do not share with anyone. - YSM Info Solution";
        const msg = otp + SEND_OTP_QUIZBUZZ_TEMPLATE_MESSAGE;
        const username = "username=" + process.env.SMS_OTP_USER_NAME;
        const password = "&password=" + process.env.SMS_OTP_PASSWORD;
        const senderid = "&from=" + process.env.SMS_OTP_SENDER_ID;
        const numbers = "&to=" + mobile;
        const message = "&text=" + msg.replace(/ /g, '+');
        const peid = "&pe_id=" + process.env.SMS_OTP_PE_ID;
        const templateid = "&template_id=" + process.env.SMS_OTP_QUIZBUZZ_TEMPLATE_ID;

        const data = username + password + senderid + numbers + message + peid + templateid;
        
        const requestUrl = process.env.SMS_OTP_SHTECH_URL + data;

        const response = await fetch(requestUrl, {
            method: 'GET',
            headers: {
                'User-Agent': process.env.SMS_OTP_USER_AGENT
            }
        });

        const responseCode = response.status;

        if (responseCode === 200) { // success
            console.log(`send OTP via SMS`);
            return "success";
        } else {
            console.log("GET request not worked");
            return "error";
        }

    } catch (error) {
        console.log("Error SMS:", error);
        return "error " + error.message;
    }
}

export default sendOtpSms;