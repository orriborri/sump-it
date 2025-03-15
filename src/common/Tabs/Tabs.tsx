import { Tabs as TabsComponent } from "@mantine/core";

interface TabProps<T extends string> {
  tabs: T[];
  defaultTab?: T;
  onChange: (value: T) => void;
  value: T;
}

export const tabs = <T extends string>({
  tabs,
  defaultTab,
  onChange,
  value,
}: TabProps<T>) => {
  const dTab = defaultTab ?? tabs[0];
  return (
    <TabsComponent
      defaultValue={dTab}
      onChange={(val) => onChange(val as T)}
      value={value}
    >
      <TabsComponent.List>
        {tabs.map((it, i) => {
          return (
            <TabsComponent.Tab value={it} key={i}>
              {it}
            </TabsComponent.Tab>
          );
        })}
      </TabsComponent.List>
    </TabsComponent>
  );
};
