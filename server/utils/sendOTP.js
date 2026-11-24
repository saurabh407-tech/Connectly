
import nodemailer from 'nodemailer';

const smtpPort = Number(process.env.SMTP_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  // Prevent SMTP from hanging indefinitely
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

const sendOTP = async (email, otp, purpose = 'registration') => {
  const isRegistration = purpose === 'registration';

  const subject = isRegistration
    ? 'Connectly - Email Verification OTP'
    : 'Connectly - Password Reset OTP';

  const heading = isRegistration
    ? 'Verify Your Email'
    : 'Reset Your Password';

  try {
    const info = await transporter.sendMail({
      from: `"Connectly" <${process.env.SMTP_FROM}>`,
      to: email,
      subject,

      text: `Your Connectly OTP is ${otp}. It expires in 5 minutes.`,

      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>${heading}</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing: 8px;">${otp}</h1>
          <p>This OTP expires in 5 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    console.log('OTP email sent:', {
      email,
      messageId: info.messageId,
    });

    return info;
  } catch (error) {
    console.error('OTP email sending failed:', {
      message: error.message,
      code: error.code,
      command: error.command,
    });

    throw error;
  }
};

export default sendOTP;
