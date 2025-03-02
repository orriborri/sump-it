import { ChooseMaker } from "./ChooseMaker";
import { AddMethod } from "./AddMethod";

type Props = {
  onSelect: (key: string, id: number) => void;
};

export const Methods = ({ onSelect }: Props) => {
  return (
    <>
      <ChooseMaker onSelect={onSelect} />
      <AddMethod />
    </>
  );
};
