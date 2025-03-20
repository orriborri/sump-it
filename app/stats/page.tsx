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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEffect, useState } from "react";
import { deleteBrew, getBrews } from "./data";
import type { Brew } from "./data";

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
