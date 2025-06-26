import { Box, Button, Stack } from "@mui/material";
import Link from "next/link";
const Page = () => {
  return (
    <Box>
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        spacing={2} 
        flexWrap="wrap"
        sx={{ gap: 2 }}
      >
        <Button
          component={Link}
          href="/brew"
          variant="contained"
          color="primary"
          size="large"
          fullWidth={{ xs: true, sm: false }}
        >
          Let&apos;s brew coffee
        </Button>
        <Button
          component={Link}
          href="/stats"
          variant="contained"
          color="secondary"
          size="large"
          fullWidth={{ xs: true, sm: false }}
        >
          View Stats
        </Button>
        <Button
          component={Link}
          href="/manage"
          variant="contained"
          color="info"
          size="large"
          fullWidth={{ xs: true, sm: false }}
        >
          Manage Items
        </Button>
        <Button
          component={Link}
          href="/manage/grinders"
          variant="outlined"
          color="primary"
          size="large"
          fullWidth={{ xs: true, sm: false }}
        >
          Manage Grinders
        </Button>
      </Stack>
    </Box>
  );
};

export default Page;
