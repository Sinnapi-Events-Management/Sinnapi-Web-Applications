import { Link as RouterLink } from "react-router-dom";
import { Card, CardActionArea, CardContent, CardMedia, Typography, Stack, Rating, Box } from "@mui/material";
import PlaceIcon from "@mui/icons-material/Place";
import { formatMoney } from "@/lib/config";

export type VendorCardData = {
  id: string; slug: string; business_name: string; base_city: string | null;
  primary_image_url: string | null; profile_image_url: string | null;
  starting_price: number | null; starting_price_currency: string | null;
  avg_rating: number; review_count: number;
};

export default function VendorCard({ vendor }: { vendor: VendorCardData }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardActionArea component={RouterLink} to={`/discover/vendors/${vendor.slug}`} sx={{ height: "100%" }}>
        <CardMedia component="img" height="160" image={vendor.primary_image_url ?? vendor.profile_image_url ?? "/placeholder-vendor.svg"} alt={vendor.business_name} sx={{ bgcolor: "grey.100" }} />
        <CardContent>
          <Typography variant="h6" noWrap>{vendor.business_name}</Typography>
          {vendor.base_city && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "text.secondary", mt: 0.5 }}>
              <PlaceIcon fontSize="inherit" /><Typography variant="body2">{vendor.base_city}</Typography>
            </Stack>
          )}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <Rating value={vendor.avg_rating} precision={0.5} size="small" readOnly />
            <Typography variant="caption" color="text.secondary">({vendor.review_count})</Typography>
          </Stack>
          {vendor.starting_price != null && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <Box component="span" color="text.secondary">From </Box>
              <Box component="span" fontWeight={600}>{formatMoney(vendor.starting_price, vendor.starting_price_currency)}</Box>
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
