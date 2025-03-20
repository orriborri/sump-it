import { db } from "@/app/lib/database";
import { BrewFeedbackForm } from "./BrewFeedbackForm";

export default async function Page({ params }: { params: { id: string } }) {


    const brewId = parseInt(params.id);

  const brew = await db
    .selectFrom("brews")
    .selectAll()
    .where("id", "=", brewId)
    .executeTakeFirst();

  if (!brew) {
    return <div>Brew not found</div>;
  }

  return (

      <BrewFeedbackForm brewId={brewId} />
  );
}
