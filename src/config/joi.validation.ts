import * as Joi from "joi";

export const envSchema = Joi.object({
  // DB_USER: Joi.string().required(),
  // DB_PASSWORD: Joi.string().required(),
  // DB_NAME: Joi.string().required(),
  APP_PORT: Joi.number().required(),

  MAIL_USER: Joi.string().required(),
  MAIL_PASSWORD: Joi.string().required(),
});
