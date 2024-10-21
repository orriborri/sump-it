"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Typography } from "@mui/material";

const Page = () => {
  return (
    <>
      <Typography variant="h1">Brew coffe</Typography>
      <h2>bean</h2>
      <h2>method</h2>
      <h2>amount</h2>
    </>
  );
};
export default Page;
