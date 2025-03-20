"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  IconButton,
  Rating,
  Stack,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEffect, useState } from "react";
import { deleteBrew, getBrews } from "./actions";
import { db } from "../lib/database";
import type { InferResult } from "kysely";

const query = db
  .selectFrom("brews")
  .leftJoin("beans", "beans.id", "brews.bean_id")
  .leftJoin("methods", "methods.id", "brews.method_id")
  .leftJoin("grinders", "grinders.id", "brews.grinder_id")
  .leftJoin("brew_feedback", "brew_feedback.brew_id", "brews.id")
  .select([
    "brews.id",
    "brews.created_at",
    "beans.name as bean_name",
    "methods.name as method_name",
    "grinders.name as grinder_name",
    "brews.grind",
    "brews.water",
    "brews.dose",
    "brews.ratio",
    "brew_feedback.too_strong",
    "brew_feedback.too_weak",
    "brew_feedback.is_sour",
    "brew_feedback.is_bitter",
    "brew_feedback.overall_rating",
    "brew_feedback.coffee_amount_ml",
  ]);

type Brew = InferResult<typeof query>[0];

const StatsTable = () => {
  const [items, setItems] = useState<Brew[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      const brews = await getBrews();
      setItems(brews);
    };
    fetchItems();
  }, []);

  const handleDelete = async (id: number) => {
    await deleteBrew(id);
    const brews = await getBrews();
    setItems(brews);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
        Statistics
      </Typography>
      <TableContainer component={Paper} sx={{ maxHeight: "70vh" }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Bean</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Grinder</TableCell>
              <TableCell align="right">Grind Size</TableCell>
              <TableCell align="right">Water (g)</TableCell>
              <TableCell align="right">Dose (g)</TableCell>
              <TableCell align="right">Ratio</TableCell>
              <TableCell align="center">Feedback</TableCell>
              <TableCell align="center">Rating</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((brew) => (
              <TableRow key={brew.id} hover>
                <TableCell>
                  {new Date(brew.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>{brew.bean_name}</TableCell>
                <TableCell>{brew.method_name}</TableCell>
                <TableCell>{brew.grinder_name}</TableCell>
                <TableCell align="right">{brew.grind}</TableCell>
                <TableCell align="right">{brew.water}</TableCell>
                <TableCell align="right">{brew.dose}</TableCell>
                <TableCell align="right">{brew.ratio}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    {brew.too_strong && (
                      <Chip label="Too Strong" size="small" color="error" />
                    )}
                    {brew.too_weak && (
                      <Chip label="Too Weak" size="small" color="warning" />
                    )}
                    {brew.is_sour && (
                      <Chip label="Sour" size="small" color="info" />
                    )}
                    {brew.is_bitter && (
                      <Chip label="Bitter" size="small" color="secondary" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  {brew.overall_rating !== null && (
                    <Rating value={brew.overall_rating} readOnly size="small" />
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    onClick={() => handleDelete(brew.id)}
                    color="error"
                    size="small"
                    aria-label="delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default StatsTable;
