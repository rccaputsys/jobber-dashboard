// src/lib/resend.ts
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email: string, firstName?: string) {
  const name = firstName || "there";
  
  await resend.emails.send({
    from: "Ryan <ryan@ownerview.io>",
    to: email,
    replyTo: "support@ownerview.io",
    subject: "Welcome to AccuInsight – and a quick backstory",
    html: `
      <p>Hey ${name},</p>
      
      <p>Thanks for signing up for AccuInsight by OwnerView! Your dashboard is ready to go.</p>
      
      <p>Quick backstory: I owned a home service business for years. I know what it's like to chase invoices, wonder which quotes went cold, and have jobs sitting in the backlog longer than they should.</p>
      
      <p>I built AccuInsight because I kept wishing I could see all that stuff in one place without digging through reports for 30 minutes. Simple metrics, no fluff – just what you need to stay on top of your business.</p>
      
      <p>I'm a solo founder, so your feedback means everything. If something's confusing, missing, or broken – just reply to this email. I read every one.</p>
      
      <p>Thanks for giving AccuInsight a shot.</p>
      
      <p>– Ryan<br/>
      Founder, OwnerView</p>
    `,
  });
}