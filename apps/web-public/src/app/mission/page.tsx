import type { Metadata } from "next";
import { Typography } from "@mui/material";
import Prose from "@/components/common/Prose";

export const metadata: Metadata = { title: "Mission", description: "Sinnapi's mission.", alternates: { canonical: "/mission" } };

export default function MissionPage() {
  return (
    <Prose title="Our Mission">
      <Typography component="p">
        To make it easier for everyone to plan their events at their convenience in the least time possible, by
        providing a one-stop home for authentic event service providers across the world.
      </Typography>
    </Prose>
  );
}
