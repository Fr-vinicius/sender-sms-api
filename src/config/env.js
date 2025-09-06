import dotenv from "dotenv";
dotenv.config();

const required = [
  "SUPABASE_DB_URL",
  "WEBHOOK_URL",
  "SINCH_URL",
  "SINCH_NUMBER",
  "SINCH_AUTH",
  "CALLBACK_URL",
];
for (const k of required) {
  if (!process.env[k]) throw new Error(`${k} is required in env`);
}

export const PORT = process.env.PORT || 8080;
export const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;
export const WEBHOOK_URL = process.env.WEBHOOK_URL;
export const SINCH_URL = process.env.SINCH_URL;
export const SINCH_AUTH = process.env.SINCH_AUTH;
export const SINCH_NUMBER = process.env.SINCH_NUMBER;
export const CALLBACK_URL = process.env.CALLBACK_URL;
export const HEALTH_CHECK_TO = process.env.HEALTH_CHECK_TO;

export const BATCH_SIZE = Number(process.env.BATCH_SIZE || 500);
export const DB_MAX_POOL = Number(process.env.DB_MAX_POOL || 20);
export const SMS_CONCURRENCY = Number(process.env.SMS_CONCURRENCY || 20);
export const SMS_RETRIES = Number(process.env.SMS_RETRIES || 3);
export const SLUG_LENGTH = Number(process.env.SLUG_LENGTH || 7);
