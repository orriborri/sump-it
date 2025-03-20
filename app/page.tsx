import { Box, Button, Stack } from "@mui/material";
import Link from "next/link";

const Page = () => {
  return (
    <Box>
      <Stack direction="row" spacing={2}>
        <Button
          component={Link}
          href="/brew"
          variant="contained"
          color="primary"
        >
          Let's brew coffee
        </Button>
        <Button
          component={Link}
          href="/stats"
          variant="contained"
          color="secondary"
        >
          View Stats
        </Button>
      </Stack>
    </Box>
  );
};

export default Page;
