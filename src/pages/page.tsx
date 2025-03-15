"use client";
import React from "react";
import { Box, Button, Divider, Paper } from "@mui/material";
import BeanSelector from "../../domain/brew/common/BeanSelector";
import GrinderSelector from "../../domain/brew/common/GrinderSelector";
import Methods from "../../domain/brew/common/Methods";
import AddMethod from "../../domain/brew/common/AddMethod";
import { useFormHandler } from "../../domain/brew/hooks/useFormHandler";

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
            <Methods onSelect={handleChange} />
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
      <AddMethod />
    </Box>
  );
};

export default Page;
