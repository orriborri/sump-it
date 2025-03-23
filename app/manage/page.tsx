import { Box, Container, Typography } from "@mui/material";
import { AddBeanForm } from "./AddBeanForm";
import { AddMethodForm } from "./AddMethodForm";
import { AddGrinderForm } from "./AddGrinderForm";

const ManagePage = () => {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Coffee Items
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Add New Bean
        </Typography>
        <AddBeanForm />
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Add New Brewing Method
        </Typography>
        <AddMethodForm />
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Add New Grinder
        </Typography>
        <AddGrinderForm />
      </Box>
    </Container>
  );
};

export default ManagePage;
