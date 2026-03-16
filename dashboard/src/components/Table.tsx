import React from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  rowKey?: (item: T, index: number) => string;
}

export default function Table<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = 'No se encontraron datos',
  rowKey,
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-discord-muted">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-discord-lighter">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left text-xs font-semibold text-discord-muted uppercase tracking-wider px-4 py-3"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={rowKey ? rowKey(item, i) : (item.id ?? i)} className="border-b border-discord-lighter/30 hover:bg-discord-lighter/20 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-discord-white">
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
