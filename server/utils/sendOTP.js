
const sendOTP = async (email, otp, purpose = 'registration') => {
  const isRegistration = purpose === 'registration';

  const subject = isRegistration
    ? 'Connectly - Email Verification OTP'
    : 'Connectly - Password Reset OTP';

  const heading = isRegistration
    ? 'Verify Your Email'
    : 'Reset Your Password';

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SMTP_FROM;

  if (!apiKey || !senderEmail) {
    throw new Error('Brevo API configuration is missing');
  }

  const emailPayload = {
    sender: {
      name: 'Connectly',
      email: senderEmail,
    },
    to: [{ email }],
    subject,
    textContent: `Your Connectly OTP is ${otp}. It expires in 5 minutes.`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>${heading}</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 8px;">${otp}</h1>
        <p>This OTP expires in 5 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    const response = await fetch(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
        signal: AbortSignal.timeout(15000),
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        `Brevo API error (${response.status}): ${
          result.message || 'Email sending failed'
        }`
      );
    }

    console.log('OTP email accepted by Brevo:', result.messageId);

    return result;
  } catch (error) {
    console.error('OTP email sending failed:', error.message);
    throw error;
  }
};

export default sendOTP;
