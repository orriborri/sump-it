import { Box, FormControl } from "@mui/material";
import SelectActionCard from "../common/SelectActionCard/SelectActionCard";
import { useFetch } from "../lib/data/hooks";
import { fetchMethods } from "../lib/data/methods/fetch";
import { on } from "events";

type Props = {
  onSelect: (key: string, id: number) => void;
};

export const ChooseMaker = ({ onSelect }: Props) => {
  const [methods, loading] = useFetch(fetchMethods);
  const handleChange = (id: number) => {
    onSelect("method", id);
  };
  return (
    <Box>
      <FormControl fullWidth>
        <SelectActionCard
          cards={methods.map((it) => {
            return {
              id: it.id,
              title: it.name,
              description: "",
            };
          })}
          onChange={handleChange}
        />
      </FormControl>
    </Box>
  );
};
