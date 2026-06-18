import { Card, CardContent } from "@mui/material";
import PageTitle from "@/components/ui/PageTitle";
import EventForm from "@/components/event/EventForm";

export default function NewEvent() {
  return (
    <>
      <PageTitle title="Post an event" subtitle="Share your event so vendors can express interest." />
      <Card variant="outlined"><CardContent><EventForm /></CardContent></Card>
    </>
  );
}
