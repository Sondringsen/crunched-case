"use client";

import { useEffect, useState, useCallback } from "react";
import type { SpreadsheetContext, WriteOperation } from "@/types";

const MAX_ROWS = 500;
const MAX_COLS = 100;

export function useOffice() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = () => {
      if (typeof Office === "undefined") return;
      Office.onReady(() => setIsReady(true));
    };

    if (typeof Office !== "undefined") {
      // Inside Excel's WebView — Office.js is already injected by the host
      init();
    } else {
      // Browser / dev preview — load Office.js from CDN then initialise
      const script = document.createElement("script");
      script.src =
        "https://appsforoffice.microsoft.com/lib/1/hosted/office.js";
      script.onload = init;
      document.head.appendChild(script);
    }
  }, []);

  const getContext = useCallback(async (): Promise<SpreadsheetContext | null> => {
    if (!isReady || typeof Excel === "undefined") return null;

    return Excel.run(async (ctx) => {
      const workbook = ctx.workbook;
      const sheets = workbook.worksheets;
      sheets.load("items/name");
      const activeSheet = workbook.worksheets.getActiveWorksheet();
      activeSheet.load("name");
      const selection = workbook.getSelectedRange();
      selection.load("address");

      await ctx.sync();

      const sheetNames = sheets.items.map((s) => s.name);
      const currentSheetName = activeSheet.name;
      const selectionAddress = selection.address;

      // Get the used range of the current sheet (capped to avoid huge payloads)
      const usedRange = activeSheet.getUsedRangeOrNullObject(true);
      usedRange.load(["values", "rowCount", "columnCount"]);
      await ctx.sync();

      let data: (string | number | boolean | null)[][] = [];
      if (!usedRange.isNullObject) {
        const rowCount = Math.min(usedRange.rowCount, MAX_ROWS);
        const colCount = Math.min(usedRange.columnCount, MAX_COLS);
        data = usedRange.values.slice(0, rowCount).map((row) =>
          row.slice(0, colCount)
        );
      }

      return {
        sheets: sheetNames,
        current_sheet: currentSheetName,
        data,
        selection: selectionAddress ?? null,
      };
    });
  }, [isReady]);

  const applyOperations = useCallback(
    async (operations: WriteOperation[]) => {
      if (!isReady || operations.length === 0 || typeof Excel === "undefined") return;

      await Excel.run(async (ctx) => {
        for (const op of operations) {
          const sheet = ctx.workbook.worksheets.getItem(op.sheet);
          const range = sheet.getRange(op.range);
          range.values = op.values as string[][];
        }
        await ctx.sync();
      });
    },
    [isReady]
  );

  return { isReady, getContext, applyOperations };
}
