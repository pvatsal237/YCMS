export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail(message: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    if (process.env.NODE_ENV === "production") {
      console.error("[IYCM email] SMTP is not configured");
      return { ok: false, error: "Email could not be sent. Please try again later." };
    }
    console.info("[IYCM email:console]", { to: message.to, subject: message.subject });
    return { ok: true };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASSWORD
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "IYCM <no-reply@iycm.local>",
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return { ok: true };
  } catch (error) {
    console.error("[IYCM email] send failed", error instanceof Error ? error.message : "send failed");
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Email could not be sent. Please try again later." };
    }
    console.info("[IYCM email:fallback]", { to: message.to, subject: message.subject });
    return { ok: true };
  }
}
