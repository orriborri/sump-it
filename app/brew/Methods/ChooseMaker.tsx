import { Box, FormControl, Typography } from "@mui/material";
import SelectActionCard from "../../common/SelectActionCard/SelectActionCard";
import { useFetch } from "../../lib/data/hooks";
import { fetch } from "../../lib/data/methods/Metods";

type Props = {
  onSelect: (key: string, id: number) => void;
};

export const ChooseMaker = ({ onSelect }: Props) => {
  const [methods] = useFetch(fetch);
  const handleChange = (id: number) => {
    onSelect("method", id);
  };

  return (
    <Box>
      <FormControl fullWidth>
        <Typography variant="h5" component="h2">
          Choose method
        </Typography>
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
