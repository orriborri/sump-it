import { Box, Button, Divider, Paper } from "@mui/material";
import { BeanSelector } from "../../../domain/brew/components/BeanSelector";
import { GrinderSelector } from "../../../domain/brew/components/GrinderSelector";
import { MethodSelector } from "../../../domain/brew/components/MethodSelector";
import { CreateMethod } from "../../../domain/brew/components/CreateMethod";
import { useFormHandler } from "../../../domain/brew/hooks/useFormHandler";

const Page = () => {
  const { handleChange, handleSubmit } = useFormHandler();

  return (
    <Box>
      <Paper elevation={3} sx={{ padding: 2 }}>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Box>
            <MethodSelector onSelect={handleChange} />
          </Box>
          <Divider />
          <BeanSelector onSelect={handleChange} />
          <Divider />
          <GrinderSelector onSelect={handleChange} />
          <Button type="submit" variant="contained">
            Submit
          </Button>
        </Box>
      </Paper>
      <CreateMethod />
    </Box>
  );
};

export default Page;