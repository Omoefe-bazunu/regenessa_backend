const axios = require("axios");

/**
 * Verifies a transaction with Paystack API
 * @param {string} reference - The transaction reference from the frontend
 * @returns {Promise<object|null>} - Returns the data object if successful, else null
 */
const verifyPaystackPayment = async (reference) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    // Check if the transaction was actually successful and matches the intent
    if (response.data.status && response.data.data.status === "success") {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error(
      "Paystack verification error:",
      error.response?.data || error.message,
    );
    return null;
  }
};

module.exports = { verifyPaystackPayment };
