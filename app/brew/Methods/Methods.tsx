import { Box, Button } from "@mui/material";
import { ChooseMaker } from "./ChooseMaker";
import { useState } from "react";
import { AddMethod } from "./AddMethod";

type Props = {
  onSelect: (key: string, id: number) => void;
};

export const Methods = ({ onSelect }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ChooseMaker onSelect={onSelect} />
      <AddMethod />
    </>
  );
};
