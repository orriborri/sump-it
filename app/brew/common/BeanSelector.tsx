import React from "react";
import { Select, MenuItem } from "@mui/material";

export const BeanSelector = ({ onSelect }) => {
  const handleChange = (event) => {
    onSelect("beanId", event.target.value);
  };

  return (
    <Select defaultValue="" onChange={handleChange}>
      <MenuItem value="" disabled>Select a Bean</MenuItem>
      <MenuItem value={1}>Bean 1</MenuItem>
      <MenuItem value={2}>Bean 2</MenuItem>
    </Select>
  );
};

export default BeanSelector;