import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Stack,
  Divider
} from "@mui/material";
import { 
  Coffee, 
  LocalCafe, 
  Settings,
  Add
} from "@mui/icons-material";
import Link from "next/link";
import { AddBeanForm } from "./AddBeanForm";
import { AddMethodForm } from "./AddMethodForm";
import { AddGrinderForm } from "./AddGrinderForm";

const ManagePage = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Coffee Items
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Add and manage your coffee beans, brewing methods, and grinders.
      </Typography>

      {/* Quick Actions */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2}
            sx={{ gap: 2 }}
          >
            <Button
              component={Link}
              href="/manage/grinders"
              variant="contained"
              startIcon={<Settings />}
              size="large"
              fullWidth
            >
              Manage Grinders
            </Button>
            <Button
              component={Link}
              href="/manage/grinders/new"
              variant="outlined"
              startIcon={<Add />}
              size="large"
              fullWidth
            >
              Add New Grinder
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Divider sx={{ my: 4 }} />

      {/* Add Forms */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Coffee color="primary" />
              <Typography variant="h6">
                Add New Bean
              </Typography>
            </Stack>
            <AddBeanForm />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <LocalCafe color="primary" />
              <Typography variant="h6">
                Add New Method
              </Typography>
            </Stack>
            <AddMethodForm />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Settings color="primary" />
              <Typography variant="h6">
                Add New Grinder
              </Typography>
            </Stack>
            <AddGrinderForm />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default ManagePage;
