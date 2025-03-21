import type { Beans, Grinders, Methods } from "../lib/db";
import type { RuntimeType } from "../lib/types";
import { Select } from "../common/Select";
import { Input } from "../common/Input";
import { Control } from "react-hook-form";
import type { BrewFormData } from "./types";

interface Props {
  control: Control<BrewFormData>;
  beans: RuntimeType<Beans>[];
  methods: RuntimeType<Methods>[];
  grinders: RuntimeType<Grinders>[];
}

export const SelectionInputs = ({
  control,
  beans,
  methods,
  grinders,
}: Props) => {
  return (
    <>
      <Select
        control={control}
        name="method_id"
        label="Brewer"
        items={methods}
        getKey={(method: RuntimeType<Methods>) => method.id}
        getValue={(method: RuntimeType<Methods>) => method.id.toString()}
        getLabel={(method: RuntimeType<Methods>) => method.name}
      />
      <Select
        control={control}
        name="bean_id"
        label="Beans"
        items={beans}
        getKey={(bean: RuntimeType<Beans>) => bean.id}
        getValue={(bean: RuntimeType<Beans>) => bean.id.toString()}
        getLabel={(bean: RuntimeType<Beans>) => bean.name ?? ""}
      />
      <Select
        control={control}
        name="grinder_id"
        label="Grinder"
        items={grinders}
        getKey={(grinder: RuntimeType<Grinders>) => grinder.id}
        getValue={(grinder: RuntimeType<Grinders>) => grinder.id.toString()}
        getLabel={(grinder: RuntimeType<Grinders>) => grinder.name ?? ""}
      />
      <Input
        control={control}
        name="grind"
        label="Grind setting"
        type="number"
      />
    </>
  );
};
