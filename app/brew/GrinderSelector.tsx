import { useFetch } from "../lib/data/hooks";
import { fetchBeans } from "../lib/data/beans/fetch";
import { useState } from "react";
import { Select } from "../common/Select/Select";
import { fetchGrinders } from "../lib/data/grinders/fetch";
import { FormControl } from "@mui/material";

type Props = {
  onSelect: (key: string, id: number) => void;
};
export const GrinderSelector = ({ onSelect }: Props) => {
  const [grinders, loading] = useFetch(fetchGrinders);
  const onChange = (id: number) => {
    onSelect("grinder", id);
  };
  return (
    <FormControl>
      <Select
        items={grinders.map((it) => {
          return { ...it, name: it.name ?? "" };
        })}
        id={"id"}
        onChange={onChange}
      />
    </FormControl>
  );
};
