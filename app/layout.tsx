import React from "react";
import { Container } from "@mui/material";
import { Header } from "./common/Header";

export const metadata = {
  title: "Sump It",
  description: "Coffee brewing app",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Container>
          <Header />
          {children}
        </Container>
      </body>
    </html>
  );
};

export default RootLayout;
