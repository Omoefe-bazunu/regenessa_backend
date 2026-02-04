const axios = require("axios");

const FLW_BASE_URL = "https://api.flutterwave.com/v3";
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

// Initialize Payment
const initializePayment = async (paymentData) => {
  try {
    const payload = {
      tx_ref: `REG-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      amount: paymentData.amount,
      currency: "NGN",
      redirect_url: `${process.env.FRONTEND_URL}/checkout/verify`,
      payment_options: "card,banktransfer,ussd",
      customer: {
        email: paymentData.email,
        name: paymentData.name,
        phonenumber: paymentData.phone || "",
      },
      customizations: {
        title: "Regenessa Purchase",
        description: "Payment for regenerative supplements",
        logo: "https://regenessa.com/logo.png",
      },
    };

    const response = await axios.post(`${FLW_BASE_URL}/payments`, payload, {
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (response.data.status === "success") {
      return {
        status: "success",
        link: response.data.data.link,
        tx_ref: payload.tx_ref,
      };
    }

    throw new Error("Payment initialization failed");
  } catch (error) {
    throw new Error(
      "Payment initialization failed: " +
        (error.response?.data?.message || error.message),
    );
  }
};

// Verify Payment
const verifyPayment = async (transactionId) => {
  try {
    const response = await axios.get(
      `${FLW_BASE_URL}/transactions/${transactionId}/verify`,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
        },
      },
    );

    const { data } = response.data;

    if (
      data.status === "successful" &&
      data.amount >= 0 &&
      data.currency === "NGN"
    ) {
      return {
        status: data.status,
        amount: data.amount,
        tx_ref: data.tx_ref,
        customer: data.customer,
        flw_ref: data.flw_ref,
      };
    }

    return null;
  } catch (error) {
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
