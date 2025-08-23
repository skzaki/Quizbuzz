const USER_AGENT = "Mozilla/5.0";
const SHTECH_URL = "http://49.50.67.32/smsapi/httpapi.jsp?";

// Username & password
const USER_NAME = "ysmsoft";
const PASSWORD = "ysmsoft123";

// PE ID
const PE_ID = "1701170599662369758";

// Sender ID
const SENDER_ID = "YSMINF";

// TEMPLATE ID
const SEND_OTP_QUIZBUZZ_TEMPLATE_ID = "1707172951100016546";

// TEMPLATE MESSAGES


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
        // console.log("Request URL:", requestUrl);

        const response = await fetch(requestUrl, {
            method: 'GET',
            headers: {
                'User-Agent': process.env.SMS_OTP_USER_AGENT
            }
        });

        const responseCode = response.status;
        // console.log("GET Response Code:", responseCode);

        if (responseCode === 200) { // success
            // const responseText = await response.text();
            // console.log("Response:", responseText);
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

// Main execution (equivalent to main method)
async function main() {
    try {
        const result = await sendOtpSms(
            "+7755910420",
            "4564",
        );
        console.log("SMS Send Result:", result);
    } catch (error) {
        console.error("Failed to send SMS:", error);
    }
}


export default sendOtpSms;
