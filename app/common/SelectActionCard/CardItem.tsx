import * as React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import CardActionArea from "@mui/material/CardActionArea";
type Props = {
  card: { id: number; title: string; description: string };
  isSelected: boolean;
  onClick: (index: number) => void;
};

export const CardItem = ({ card, isSelected, onClick }: Props) => {
  return (
    <Card>
      <CardActionArea
        onClick={() => onClick(card.id)}
        data-active={isSelected ? "" : undefined}
        sx={{
          height: "100%",
          "&[data-active]": {
            backgroundColor: "action.selected",
            "&:hover": {
              backgroundColor: "action.selectedHover",
            },
          },
        }}
      >
        <CardContent sx={{ height: "100%" }}>
          <Typography variant="h5" component="div">
            {card.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {card.description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

