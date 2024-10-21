import { TableComponent } from "@/app/common/Table/Table";
import { fetchBrews } from "../../lib/data/fetch.Brew";

export default async function Page() {
  const brews = await fetchBrews();

  return (
    <>
      <TableComponent name={"test"} columns={[]} data={brews} />
    </>
  );
}
