import { db } from "../lib/database";
import { BrewForm } from "./BrewForm";

const Page = async () => {
  const beans = await db.selectFrom("beans").selectAll().execute();
  const methods = await db.selectFrom("methods").selectAll().execute();
  const grinders = await db.selectFrom("grinders").selectAll().execute();

  return <BrewForm beans={beans} methods={methods} grinders={grinders} />;
};

export default Page;
