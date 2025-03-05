import dotenv from "dotenv";

dotenv.config();

export const envConfig = () => ({
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  APP_PORT: process.env.PORT,

  TZ: "America/Bogota",
  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASSWORD: process.env.MAIL_PASSWORD,

  MAILERSEND_API_KEY: process.env.MAILERSEND_API_KEY,
  MAILER_SENDER: process.env.MAILER_SENDER,

  RESEND_API_KEY: process.env.RESEND_API_KEY,
});
