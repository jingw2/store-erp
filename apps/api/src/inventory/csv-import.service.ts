import { Injectable } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryTransactionType } from '@prisma/client';

type CsvRow = { materialId: string; quantity: number; note: string };
type CsvError = { row: number; error: string };
type ParseResult = (CsvRow | CsvError)[];

@Injectable()
export class CsvImportService {
  constructor(private readonly inventory: InventoryService) {}

  parseCsv(csvContent: string): ParseResult {
    const lines = csvContent.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const dataLines = lines.slice(1); // skip header
    const results: ParseResult = [];

    dataLines.forEach((line, index) => {
      const rowNumber = index + 2; // 1-based, row 1 is header
      const parts = line.split(',');
      const [materialId, quantityRaw, ...noteParts] = parts;
      const note = noteParts.join(',').trim();
      const quantity = parseFloat(quantityRaw?.trim() ?? '');
      if (!materialId?.trim()) {
        results.push({ row: rowNumber, error: 'materialId is required' });
        return;
      }
      if (isNaN(quantity)) {
        results.push({ row: rowNumber, error: 'quantity must be a number' });
        return;
      }
      results.push({ materialId: materialId.trim(), quantity, note });
    });

    return results;
  }

  async bulkImport(tenantId: string, storeId: string, userId: string, csvContent: string) {
    const rows = this.parseCsv(csvContent);
    let imported = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if ('error' in row) {
        errors.push(row);
        continue;
      }
      try {
        await this.inventory.applyDelta(
          tenantId, storeId, row.materialId, row.quantity,
          InventoryTransactionType.INITIAL_IMPORT, userId, row.note,
        );
        imported++;
      } catch (err: unknown) {
        const rowNumber = i + 2; // 1-based, row 1 is header
        errors.push({ row: rowNumber, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return { imported, errors };
  }
}
