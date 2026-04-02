export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is required in production. In Railway: Variables → add AUTH_SECRET (e.g. run `openssl rand -base64 32` locally and paste)."
    );
  }

  if (!process.env.NEXTAUTH_URL?.trim()) {
    console.warn(
      "read-later: NEXTAUTH_URL is unset. Set it to your public https URL in Railway for reliable auth callbacks."
    );
  }
}
