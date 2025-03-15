import { Select } from "../../../../common/Select/Select";
import { FormControl, Typography } from "@mui/material";
import { useGrinders } from "../hooks/useGrinders";

type Props = {
  onSelect: (key: string, id: number) => void;
};

export const GrinderSelector = ({ onSelect }: Props) => {
  const grinders = useGrinders();
  const onChange = (id: number) => {
    onSelect("grinder", id);
  };

  return (
    <>
      <Typography variant="h5" component="h2">
        Choose grinder
      </Typography>
      <FormControl>
        <Select
          items={grinders.map((it) => {
            return { ...it, name: it.name ?? "" };
          })}
          id={"id"}
          onChange={onChange}
        />
      </FormControl>
    </>
  );
};