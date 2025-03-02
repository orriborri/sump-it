import React, { useState } from "react";
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useAddMethod } from "../hooks/useAddMethod";

export const AddMethod = () => {
  const [open, setOpen] = useState(false);
  const [methodName, setMethodName] = useState("");
  const { addMethod } = useAddMethod();

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAdd = async () => {
    await addMethod(methodName);
    setMethodName("");
    handleClose();
  };

  return (
    <div>
      <Button variant="contained" onClick={handleClickOpen}>
        Add Method
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Add New Method</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Method"
            fullWidth
            value={methodName}
            onChange={(e) => setMethodName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAdd}>Add</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AddMethod;