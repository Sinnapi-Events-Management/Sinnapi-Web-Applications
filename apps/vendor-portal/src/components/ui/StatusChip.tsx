import { Chip } from "@mui/material";
import { statusColor } from "@/lib/status";
import { titleize } from "@/lib/config";

export default function StatusChip({ status, size = "small" }: { status: string; size?: "small" | "medium" }) {
  const color = statusColor(status);
  return <Chip size={size} color={color} label={titleize(status)} variant={color === "default" ? "outlined" : "filled"} />;
}
