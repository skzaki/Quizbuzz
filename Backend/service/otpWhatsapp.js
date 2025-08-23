
async function sendOtpWhatsApp(destination, userName,  otp) {
    try {
        // Create JSON payload
        const payload = {
            apiKey: process.env.WHATSAPP_OTP_API_KEY,
            campaignName: "Quizbuzz OTP Verification",
            destination: destination,
            userName: userName,
            source: "My Contact",
            templateParams: [otp],
            buttons: [
                {
                    type: "button",
                    sub_type: "url",
                    index: 0,
                    parameters: [
                        {
                            type: "text",
                            text: otp
                        }
                    ]
                }
            ],
            media: {},
            carouselCards: [],
            location: {},
            paramsFallbackValue: {
                FirstName: "user"
            }
        };

        // Make API request
        const response = await fetch(process.env.WHATSAPP_OTP_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${process.env.WHATSAPP_OTP_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        // Get response code
        const responseCode = response.status;
        console.log("Response Code:", responseCode);

        if (responseCode === 401) {
            console.log("Unauthorized: Check the API Key or Authentication Method");
        }

        // Get response data
        const responseData = await response.json();
        // console.log("Response Data:", responseData);
        
        console.log("send OTP via WhatsApp");
        
        return responseData;

    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}



// For browser/module usage - export the function
export default sendOtpWhatsApp;
