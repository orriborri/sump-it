import React from "react";
import { Select, MenuItem } from "@mui/material";

export const GrinderSelector = ({ onSelect }) => {
  const handleChange = (event) => {
    onSelect("grinderId", event.target.value);
  };

  return (
    <Select defaultValue="" onChange={handleChange}>
      <MenuItem value="" disabled>Select a Grinder</MenuItem>
      <MenuItem value={1}>Grinder 1</MenuItem>
      <MenuItem value={2}>Grinder 2</MenuItem>
    </Select>
  );
};

export default GrinderSelector;