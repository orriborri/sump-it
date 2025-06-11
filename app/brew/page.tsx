import { db } from "../lib/database";
import { Box, Typography } from "@mui/material";
import FormWrapper from './FormWrapper';

const Page = async () => {
  const beans = await db.selectFrom("beans").selectAll().execute();
  const methods = await db.selectFrom("methods").selectAll().execute();
  const grinders = await db.selectFrom("grinders").selectAll().execute();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Coffee Brewing
      </Typography>

      <FormWrapper beans={beans} methods={methods} grinders={grinders} />
    </Box>
  );
};

export default Page;