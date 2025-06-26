import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Stack,
  Grid,
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
              fullWidth={{ xs: true, sm: false }}
            >
              Manage Grinders
            </Button>
            <Button
              component={Link}
              href="/manage/grinders/new"
              variant="outlined"
              startIcon={<Add />}
              size="large"
              fullWidth={{ xs: true, sm: false }}
            >
              Add New Grinder
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Divider sx={{ my: 4 }} />

      {/* Add Forms */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
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
        </Grid>

        <Grid item xs={12} md={4}>
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
        </Grid>

        <Grid item xs={12} md={4}>
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
        </Grid>
      </Grid>
    </Box>
  );
};

export default ManagePage;
