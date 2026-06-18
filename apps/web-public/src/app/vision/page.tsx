import type { Metadata } from "next";
import { Typography } from "@mui/material";
import Prose from "@/components/common/Prose";

export const metadata: Metadata = { title: "Vision", description: "Sinnapi's vision.", alternates: { canonical: "/vision" } };

export default function VisionPage() {
  return (
    <Prose title="Our Vision">
      <Typography component="p">Empowering everyone to plan their events seamlessly, wherever they are.</Typography>
    </Prose>
  );
}
