import {
  InputLabel,
  MenuItem,
  Select as MuiSelect,
  SelectChangeEvent,
} from "@mui/material";
import { useState } from "react";

type SelectType = {
  id: number;
  name: string;
};

type Props<T extends SelectType> = {
  items: T[];
  id: string;
  onChange: (id: number) => void;
};

export const select = <T extends SelectType>({
  items,
  id,
  onChange,
}: Props<T>) => {
  const [selected, setSelected] = useState<number | "">("");
  const handleChange = (event: SelectChangeEvent<number | "">) => {
    const value = event.target.value as number;
    setSelected(value);
    onChange(value);
  };

  return (
    <>
      <InputLabel id={`select-${id}-label`}>Beans</InputLabel>
      <MuiSelect
        value={selected}
        id={`select-${id}`}
        label={`select-${id}-label`}
        onChange={handleChange}
      >
        {items.map((item, i) => (
          <MenuItem value={item.id} key={i}>
            {String(item.name ?? "")}
          </MenuItem>
        ))}
      </MuiSelect>
    </>
  );
};
