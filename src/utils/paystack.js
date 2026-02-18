const axios = require("axios");

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

/**
 * Initialize Payment
 * Explicitly forcing channels to ensure Bank Transfer is available
 */
const initializePayment = async (paymentData) => {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: paymentData.email,
        amount: Math.round(paymentData.amount * 100), // Convert to kobo [cite: 36]
        callback_url: `${process.env.FRONTEND_URL}/checkout/verify`,

        // --- CRITICAL UPDATE: Explicitly enabling all channels ---
        // This ensures "bank_transfer" is requested from Paystack
        channels: [
          "card",
          "bank",
          "ussd",
          "qr",
          "mobile_money",
          "bank_transfer",
        ],

        metadata: {
          custom_fields: [
            {
              display_name: "Customer Name",
              variable_name: "customer_name",
              value: paymentData.name,
            },
            {
              display_name: "Phone Number",
              variable_name: "phone_number",
              value: paymentData.phone,
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("Paystack response:", response.data); // DEBUG

    if (response.data.status && response.data.data) {
      return {
        status: "success",
        authorization_url: response.data.data.authorization_url, //
        access_code: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    }

    throw new Error("Payment initialization failed");
  } catch (error) {
    console.error("Paystack error:", error.response?.data || error.message);
    throw new Error(
      "Payment initialization failed: " +
        (error.response?.data?.message || error.message),
    );
  }
};

/**
 * Verify Payment
 * Confirms the status of the transaction before delivering value [cite: 1, 23, 26]
 */
const verifyPayment = async (reference) => {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    if (response.data.status && response.data.data.status === "success") {
      return {
        status: response.data.data.status, //
        amount: response.data.data.amount / 100, // Convert from kobo [cite: 36]
        reference: response.data.data.reference,
        customer: response.data.data.customer,
        paid_at: response.data.data.paid_at,
      };
    }

    return null;
  } catch (error) {
    console.error("Verification error:", error.response?.data || error.message);
    throw new Error(
      "Payment verification failed: " +
        (error.response?.data?.message || error.message),
    );
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
};
