import { Box, FormControl, Typography } from "@mui/material";
import SelectActionCard from "../../../../common/SelectActionCard/SelectActionCard";
import { useBrews } from "../hooks/useBrews";

type Props = {
  onSelect: (key: string, id: number) => void;
};

export const MethodSelector = ({ onSelect }: Props) => {
  const brews = useBrews();
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
          cards={brews.map((it) => {
            return {
              id: it.id ?? 0,
              title: it.name ?? "",
              description: "",
            };
          })}
          onChange={handleChange}
        />
      </FormControl>
    </Box>
  );
};