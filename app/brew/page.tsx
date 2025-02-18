"use client";
import {
  Box,
  Button,
  Card,
  Divider,
  Paper,
  Select,
  TextField,
} from "@mui/material";
import { FormEvent, useState } from "react";
import { BeanSelector } from "./BeanSelector";
import { GrinderSelector } from "./GrinderSelector";
import { Methods } from "./Methods/Methods";
import { AddMethod } from "./Methods/AddMethod";

type FormData = {
  methodId?: number;
  beanId?: number;
  grinderId?: number;
};
const Page = () => {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    throw new Error("Function not implemented.");
  }
  const [formData, setFormData] = useState<FormData>();
  const handleChange = (key: string, value: number): void => {
    setFormData({
      ...formData,
      [key]: value,
    });
  };

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
