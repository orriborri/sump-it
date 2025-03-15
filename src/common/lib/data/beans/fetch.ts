'use server'

export const fetchBeans = async () => {
  return [{ name: "test1", id: 1 }, { name: "test2", id: 2 }];
  // return db.selectFrom("beans").selectAll().execute();
};