import * as Joi from "joi";

export const envSchema = Joi.object({
  // DB_USER: Joi.string().required(),
  // DB_PASSWORD: Joi.string().required(),
  // DB_NAME: Joi.string().required(),
  APP_PORT: Joi.number().required(),

  MAIL_USER: Joi.string().required(),
  MAIL_PASSWORD: Joi.string().required(),

  MAILERSEND_API_KEY: Joi.string().required(),
  MAILER_SENDER: Joi.string().required(),

  RESEND_API_KEY: Joi.string().required(),
});
