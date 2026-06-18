import type { Metadata } from "next";
import { Typography } from "@mui/material";
import Prose from "@/components/common/Prose";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <Prose title="Privacy Policy" subtitle="Your data, handled responsibly and in line with GDPR and Uganda's DPPA.">
      <Typography component="p">
        Sinnapi collects only the data needed to operate the marketplace and processes it lawfully. Sensitive
        information such as identity and banking details is encrypted and access-controlled. Where legally permissible
        you may request deletion of your personal data, subject to records we must retain for legal, financial, fraud
        prevention, or audit purposes. This is placeholder content to be replaced with reviewed privacy copy.
      </Typography>
    </Prose>
  );
}
