import {
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
  TableHTMLAttributes,
  HTMLAttributes,
} from "react";

// Props for Table
type TableProps = TableHTMLAttributes<HTMLTableElement>;

// Props for TableHeader
type TableHeaderProps = HTMLAttributes<HTMLTableSectionElement>;

// Props for TableBody
type TableBodyProps = HTMLAttributes<HTMLTableSectionElement>;

// Props for TableRow
type TableRowProps = HTMLAttributes<HTMLTableRowElement>;

// Props for TableCell
type CellElementProps = TdHTMLAttributes<HTMLTableCellElement> &
  ThHTMLAttributes<HTMLTableCellElement>;

interface TableCellProps extends CellElementProps {
  children: ReactNode; // Cell content
  isHeader?: boolean; // If true, renders as <th>, otherwise <td>
}

// Table Component
const Table: React.FC<TableProps> = ({ children, className, ...rest }) => {
  return (
    <table className={`min-w-full ${className ?? ""}`} {...rest}>
      {children}
    </table>
  );
};

// TableHeader Component
const TableHeader: React.FC<TableHeaderProps> = ({
  children,
  className,
  ...rest
}) => {
  return (
    <thead className={className} {...rest}>
      {children}
    </thead>
  );
};

// TableBody Component
const TableBody: React.FC<TableBodyProps> = ({ children, className, ...rest }) => {
  return (
    <tbody className={className} {...rest}>
      {children}
    </tbody>
  );
};

// TableRow Component
const TableRow: React.FC<TableRowProps> = ({ children, className, ...rest }) => {
  return (
    <tr className={className} {...rest}>
      {children}
    </tr>
  );
};

// TableCell Component
const TableCell: React.FC<TableCellProps> = ({
  children,
  isHeader = false,
  className,
  ...rest
}) => {
  const CellTag = isHeader ? "th" : "td";
  return (
    <CellTag className={` ${className ?? ""}`} {...rest}>
      {children}
    </CellTag>
  );
};

export { Table, TableHeader, TableBody, TableRow, TableCell };
