import { Select } from "../../../common/Select/Select";
import { FormControl, Typography } from "@mui/material";
import { useBeans } from "../hooks/useBeans";

type Props = {
  onSelect: (key: string, id: number) => void;
};

export const BeanSelector = ({ onSelect }: Props) => {
  const beans = useBeans();
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