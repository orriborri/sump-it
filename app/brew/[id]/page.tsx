import { db } from "@/app/lib/database";
import { BrewFeedbackForm } from "./BrewFeedbackForm";
import { getRecentBrewFeedback } from "./actions";

const Page = async ({ params }: { params: { id: string } }) => {
  const brewId = parseInt(params.id);
  const brew = await db
    .selectFrom("brews")
    .selectAll()
    .where("id", "=", brewId)
    .executeTakeFirst();

  if (!brew) {
    return <div>Brew not found</div>;
  }

  const recentFeedback = await getRecentBrewFeedback();

  return <BrewFeedbackForm brewId={brewId} recentFeedback={recentFeedback} />;
};

export default Page;
