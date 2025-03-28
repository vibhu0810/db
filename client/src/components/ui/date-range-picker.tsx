"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerWithRangeProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  className?: string;
}

export function DatePickerWithRange({
  date,
  setDate,
  className,
}: DatePickerWithRangeProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "h-10 w-[240px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "MMM d, yy")} -{" "}
                  {format(date.to, "MMM d, yy")}
                </>
              ) : (
                format(date.from, "MMM d, yy")
              )
            ) : (
              <span>Filter by date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="max-w-[580px] w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={1}
              className="sm:border-r"
            />
            <Calendar
              mode="range"
              defaultMonth={date?.from ? 
                new Date(date.from.getFullYear(), date.from.getMonth() + 1, 1) : 
                new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)}
              selected={date}
              onSelect={setDate}
              numberOfMonths={1}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
