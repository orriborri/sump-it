import React from "react";
import { Select, MenuItem } from "@mui/material";

export const Methods = ({ onSelect }) => {
  const handleChange = (event) => {
    onSelect("methodId", event.target.value);
  };

  return (
    <Select defaultValue="" onChange={handleChange}>
      <MenuItem value="" disabled>Select a Method</MenuItem>
      <MenuItem value={1}>Method 1</MenuItem>
      <MenuItem value={2}>Method 2</MenuItem>
    </Select>
  );
};

export default Methods;