import { useEffect, useState } from "react";
import { CardList } from "./CardList";
import { Card } from "./types";

type Props = {
  cards: Card[];
  onChange: (id: number) => void;
};

const selectActionCard = ({ cards, onChange }: Props) => {
  const [selectedCard, setSelectedCard] = useState(-1);
  useEffect(() => {
    if (selectedCard !== -1) {
      onChange(selectedCard);
    }
  }, [selectedCard]);
  return (
    <CardList
      cards={cards}
      selectedCard={selectedCard}
      onCardClick={setSelectedCard}
    />
  );
};

export default selectActionCard;
