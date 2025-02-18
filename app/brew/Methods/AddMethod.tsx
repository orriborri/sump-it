import {
  Box,
  Button,
  DialogTitle,
  FormControl,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { create } from "../../lib/data/methods/Metods";

type Props = {};

export const AddMethod = (props: Props) => {
  const [open, setOpen] = useState(false);
  const [intputField, setInputField] = useState("");
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    create(intputField);
    e.preventDefault();
    e.stopPropagation();

    setOpen(false);
  };
  return (
    <>
      <Button
        variant="outlined"
        onClick={() => {
          setOpen(true);
        }}
      >
        New
      </Button>
      <Dialog open={open}>
        <DialogTitle>Add Methods</DialogTitle>
        <DialogContent>
          <FormControl>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                padding: 2,
              }}
            >
              <Box>
                <TextField
                  required
                  label="Method Name"
                  variant="outlined"
                  type="text"
                  name="method"
                  onChange={(e) => setInputField(e.target.value)}
                />
              </Box>
              <Button type="submit" variant="contained">
                Submit
              </Button>
            </Box>
          </FormControl>
        </DialogContent>
      </Dialog>
    </>
  );
};
