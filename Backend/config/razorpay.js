const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

let base64Auth = null;

function getAuthHeader() {
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  if (!base64Auth) {
    base64Auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  }

  return base64Auth;
}

export const razorpay = {
  orders: {
    async create(payload) {
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${getAuthHeader()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Razorpay order creation failed: ${response.status} ${errorText}`);
      }

      return response.json();
    }
  }
};

export default razorpay;