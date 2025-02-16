import { useFetch } from "../lib/data/hooks";
import { fetchBeans } from "../lib/data/beans/fetch";
import { useState } from "react";
import { Select } from "../common/Select/Select";
import { FormControl } from "@mui/material";

type Props = {
  onSelect: (key: string, id: number) => void;
};
export const BeanSelector = ({ onSelect }: Props) => {
  const [beans, loading] = useFetch(fetchBeans);
  const onChange = (id: number) => {
    onSelect("bean", id);
  };

  return (
    <FormControl>
      <Select items={beans} id={"beanselector"} onChange={onChange} />
    </FormControl>
  );
};
