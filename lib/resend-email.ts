import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type OpportunityAlertParams = {
  to: string;
  matchScore: number;
  opportunity: {
    title: string;
    agency: string | null;
    responseDeadline: string | null;
    samNoticeId: string;
  };
};

export async function sendOpportunityAlertEmail({ to, matchScore, opportunity }: OpportunityAlertParams) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "alerts@govcontract.ai",
    to,
    subject: `New match (${matchScore}%): ${opportunity.title}`,
    html: `
      <p>A new opportunity matches your saved filters.</p>
      <ul>
        <li><strong>Title:</strong> ${opportunity.title}</li>
        <li><strong>Agency:</strong> ${opportunity.agency ?? "Unknown"}</li>
        <li><strong>Match score:</strong> ${matchScore}%</li>
        <li><strong>Response deadline:</strong> ${opportunity.responseDeadline ?? "TBD"}</li>
      </ul>
      <p><a href="https://sam.gov/opp/${opportunity.samNoticeId}/view">View on SAM.gov</a></p>
    `,
  });
}
