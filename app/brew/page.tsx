"use client";
import {
  Box,
  Button,
  Card,
  Paper,
  Select,
  TextField,
} from "@mui/material";
import { ChangeEvent, FormEvent, useState } from "react";
import { ChooseMaker } from "./ChooseMaker";
import { BeanSelector } from "./BeanSelector";
import { GrinderSelector } from "./GrinderSelector";

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
          <ChooseMaker onSelect={handleChange} />
          <BeanSelector onSelect={handleChange} />
          <GrinderSelector onSelect={handleChange} />
          <Button type="submit" variant="contained">
            Submit
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
export default Page;
