import type { Metadata } from "next";
import { Typography } from "@mui/material";
import Prose from "@/components/common/Prose";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <Prose title="Terms of Service" subtitle="Last updated: placeholder — replace with reviewed legal copy.">
      <Typography component="p">
        These Terms govern your use of Sinnapi. By accessing the platform you agree to use it lawfully, provide accurate
        information, and respect the rights of other users. This is placeholder content to be replaced with
        legally-reviewed terms before launch.
      </Typography>
    </Prose>
  );
}
