"use client";
import { Button } from "@mantine/core";
import { MouseEventHandler } from "react"
export interface ButtonProps {
  text: string;
  handler: MouseEventHandler<HTMLButtonElement>;
}
export const buttonComponent = ({ text, handler }: ButtonProps) => {
  return <Button onClick={handler}>{text}</Button>;
};
