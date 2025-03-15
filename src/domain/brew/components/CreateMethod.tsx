import { Box, Button, FormControl, TextField, Typography } from "@mui/material";
import { FormEvent, useState } from "react";

export const CreateMethod = () => {
  const [name, setName] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // TODO: Implement method creation
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" component="h2">
        Add new method
      </Typography>
      <FormControl fullWidth>
        <TextField
          label="Method name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="contained">
          Add
        </Button>
      </FormControl>
    </Box>
  );
};