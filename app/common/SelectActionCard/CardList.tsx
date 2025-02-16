import * as React from "react";
import Box from "@mui/material/Box";
import { CardItem } from "./CardItem"
import { Card } from "./types"

type Props = {
  cards: Card[];
  selectedCard: number;
  onCardClick: (index: number) => void;
};
export const CardList = ({ cards, selectedCard, onCardClick }: Props) => {
  return (
    <Box
      sx={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(200px, 100%), 1fr))",
        gap: 2,
      }}
    >
      {cards.map((card, index) => (
        <CardItem
          key={card.id}
          card={card}
          isSelected={selectedCard === index}
          onClick={() => onCardClick(index)}
        />
      ))}
    </Box>
  );
};

