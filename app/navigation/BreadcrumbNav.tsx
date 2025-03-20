"use client";

import { Breadcrumbs, Link as MuiLink } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BreadcrumbNav() {
  const pathname = usePathname();
  const paths = pathname.split("/").filter((p) => p);

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ py: 2 }}>
      <MuiLink component={Link} href="/" color="inherit">
        Home
      </MuiLink>
      {paths.map((path, index) => {
        const href = `/${paths.slice(0, index + 1).join("/")}`;
        const isLast = index === paths.length - 1;
        const label = path.charAt(0).toUpperCase() + path.slice(1);

        return isLast ? (
          <MuiLink key={href} color="text.primary" aria-current="page">
            {label}
          </MuiLink>
        ) : (
          <MuiLink key={href} component={Link} href={href} color="inherit">
            {label}
          </MuiLink>
        );
      })}
    </Breadcrumbs>
  );
}
