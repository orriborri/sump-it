"use client";
import { Table } from "@mantine/core";

interface Props<T> {
  columnNames: string[];
  data: T[];
}

export const TableComponent = <
  T extends Record<string, string | number | Date | null>
  >({
  columnNames,
  data,
}: Props<T>) => {
  const columns = data.length > 0 ? (Object.keys(data[0]) as (keyof T)[]) : [];
  const rows = data.map((item, index) => (
    <Table.Tr key={index}>
      {(columnNames ?? []).map((column) => (
        <Table.Td key={String(column)}>{String(item[column] ?? "")}</Table.Td>
      ))}
    </Table.Tr>
  ));

  return (
    <Table striped highlightOnHover withTableBorder withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          {columns.map((column) => (
            <Table.Th key={String(column)}>{String(column)}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};
