import { Button } from "@mui/material";
import Grid from "@mui/material/Grid2";

export default function Page() {
  return (
    <Grid container spacing={2} justifyContent="center">
      <Grid>
        <Button href="brew">Brew coffe</Button>
      </Grid>
      <Grid>
        <Button href="stats">Stats</Button>
      </Grid>
    </Grid>
  );
}
