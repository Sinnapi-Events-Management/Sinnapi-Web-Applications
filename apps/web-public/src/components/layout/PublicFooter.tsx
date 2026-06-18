import NextLink from "next/link";
import { Box, Container, Grid, Typography, Link, Stack } from "@mui/material";
import { FOOTER_NAV, SITE } from "@/lib/config/site";

export default function PublicFooter() {
  return (
    <Box component="footer" sx={{ bgcolor: "grey.900", color: "grey.100", mt: 8, py: 6 }}>
      <Container>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h5" sx={{ fontFamily: "var(--font-fraunces)", fontWeight: 600, color: "common.white" }}>
              {SITE.name}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: "grey.400", maxWidth: 320 }}>
              {SITE.description}
            </Typography>
          </Grid>
          {Object.entries(FOOTER_NAV).map(([group, links]) => (
            <Grid item xs={6} md={2.5} key={group}>
              <Typography variant="overline" sx={{ color: "grey.500" }}>{group}</Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {links.map((l) => (
                  <Link key={l.href} component={NextLink} href={l.href} color="inherit" sx={{ color: "grey.300" }}>
                    {l.label}
                  </Link>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>
        <Typography variant="caption" sx={{ display: "block", mt: 5, color: "grey.500" }}>
          © {new Date().getFullYear()} {SITE.name}. Empowering everyone to plan their events seamlessly, wherever they are.
        </Typography>
      </Container>
    </Box>
  );
}
