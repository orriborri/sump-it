import type { ReactNode } from 'react';

/** Provide the document shell for every application route. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
