import * as React from "react";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "./table";

interface ResizableTableProps extends React.ComponentPropsWithoutRef<typeof Table> {
  defaultColumnWidths?: Record<string, number>;
}

export function ResizableTable({
  children,
  defaultColumnWidths,
  className,
  ...props
}: ResizableTableProps) {
  return (
    <div className="overflow-auto">
      <Table className={cn("table-fixed", className)} {...props}>
        {children}
      </Table>
    </div>
  );
}

export function ResizableCell({
  children,
  className,
  width = "auto",
  ...props
}: React.ComponentPropsWithoutRef<typeof TableCell> & { width?: string | number }) {
  const [isResizing, setIsResizing] = React.useState(false);
  const cellRef = React.useRef<HTMLTableCellElement>(null);

  const startResizing = React.useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();

    const startX = e.pageX;
    const startWidth = cellRef.current?.offsetWidth ?? 0;

    function onMouseMove(e: MouseEvent) {
      if (cellRef.current) {
        const width = startWidth + (e.pageX - startX);
        cellRef.current.style.width = `${width}px`;
      }
    }

    function onMouseUp() {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <TableCell
      ref={cellRef}
      className={cn(
        "relative group select-none",
        isResizing && "select-none",
        className
      )}
      style={{ width }}
      {...props}
    >
      {children}
      <div
        className="absolute top-0 right-0 w-1 h-full bg-border opacity-0 cursor-col-resize group-hover:opacity-100"
        onMouseDown={startResizing}
      />
    </TableCell>
  );
}

export {
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
} from "./table";