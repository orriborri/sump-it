import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { Edit, Add } from '@mui/icons-material';
import Link from 'next/link';
import { db } from '@/app/lib/database';
import { GrindersModel } from '@/app/lib/generated-models/Grinders';
import { DeleteGrinderButton } from './DeleteGrinderButton';

async function getGrinders() {
  const grindersModel = new GrindersModel(db);
  return await grindersModel.findAll();
}

export default async function GrindersPage() {
  const grinders = await getGrinders();

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Manage Grinders
        </Typography>
        <Button
          component={Link}
          href="/manage/grinders/new"
          variant="contained"
          startIcon={<Add />}
        >
          Add New Grinder
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Range</TableCell>
              <TableCell>Step Size</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {grinders.map((grinder) => (
              <TableRow key={grinder.id}>
                <TableCell>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {grinder.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`${grinder.min_setting || 1} - ${grinder.max_setting || 40}`}
                    color="primary"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={grinder.step_size || 1}
                    color="secondary"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={grinder.setting_type || 'numeric'}
                    color="info"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      component={Link}
                      href={`/manage/grinders/${grinder.id}/edit`}
                      color="primary"
                      size="small"
                    >
                      <Edit />
                    </IconButton>
                    <DeleteGrinderButton 
                      grinderId={grinder.id}
                      grinderName={grinder.name || 'Unknown Grinder'}
                    />
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {grinders.length === 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No grinders found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add your first grinder to get started with precise grind settings.
            </Typography>
            <Button
              component={Link}
              href="/manage/grinders/new"
              variant="contained"
              startIcon={<Add />}
            >
              Add Your First Grinder
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
