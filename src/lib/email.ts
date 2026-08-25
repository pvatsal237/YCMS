export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail(message: EmailMessage): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.info("[IYCM email:console]", {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return;
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
      from: process.env.SMTP_FROM ?? "International Youth Community Meetup <no-reply@iycm.local>",
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  } catch (error) {
    console.info("[IYCM email:fallback]", {
      to: message.to,
      subject: message.subject,
      text: message.text,
      error: error instanceof Error ? error.message : "send failed",
    });
  }
}
