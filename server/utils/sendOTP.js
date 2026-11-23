
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOTP = async (email, otp, purpose = 'registration') => {
  const isRegistration = purpose === 'registration';

  const subject = isRegistration
    ? 'Connectly - Email Verification OTP'
    : 'Connectly - Password Reset OTP';

  const heading = isRegistration
    ? 'Verify Your Email'
    : 'Reset Your Password';

  await transporter.sendMail({
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
};

export default sendOTP;
