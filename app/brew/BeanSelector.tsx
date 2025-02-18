import { useFetch } from "../lib/data/hooks";
import { fetchBeans } from "../lib/data/beans/fetch";
import { useState } from "react";
import { Select } from "../common/Select/Select";
import { FormControl, Typography } from "@mui/material";

type Props = {
  onSelect: (key: string, id: number) => void;
};
export const BeanSelector = ({ onSelect }: Props) => {
  const [beans, loading] = useFetch(fetchBeans);
  const onChange = (id: number) => {
    onSelect("bean", id);
  };

  return (
    <>
      <Typography variant="h5" component="h2">
        Choose beans
      </Typography>
      <FormControl>
        <Select items={beans} id={"beanselector"} onChange={onChange} />
      </FormControl>
    </>
  );
};
