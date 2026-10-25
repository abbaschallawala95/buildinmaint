// Runs once at server start. The building is in India, but Vercel servers run in UTC, so
// "this month", dates and audit times were off by 5½ hours. Vercel reserves the TZ env var,
// so it is set here instead; Node picks up the change for every later Date call.
export function register() {
  process.env.TZ = "Asia/Kolkata";
}
