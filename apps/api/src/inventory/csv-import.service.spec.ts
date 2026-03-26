import { Test } from '@nestjs/testing';
import { CsvImportService } from './csv-import.service';
import { InventoryService } from './inventory.service';
import { InventoryTransactionType } from '@prisma/client';

const mockInventory = { applyDelta: jest.fn() };

describe('CsvImportService', () => {
  let service: CsvImportService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CsvImportService,
        { provide: InventoryService, useValue: mockInventory },
      ],
    }).compile();
    service = module.get(CsvImportService);
  });

  it('parseCsv skips header row and returns data rows', () => {
    const csv = 'materialId,quantity,note\nm1,10.5,First\nm2,20,Second';
    const result = service.parseCsv(csv);
    expect(result).toEqual([
      { materialId: 'm1', quantity: 10.5, note: 'First' },
      { materialId: 'm2', quantity: 20, note: 'Second' },
    ]);
  });

  it('parseCsv skips empty lines', () => {
    const csv = 'materialId,quantity,note\nm1,10,\n\nm2,20,Note';
    const result = service.parseCsv(csv);
    expect(result).toHaveLength(2);
  });

  it('parseCsv returns error for row with non-numeric quantity', () => {
    const csv = 'materialId,quantity,note\nm1,abc,Test';
    const result = service.parseCsv(csv);
    expect(result).toEqual([{ row: 2, error: 'quantity must be a number' }]);
  });

  it('bulkImport calls applyDelta for each valid row and returns summary', async () => {
    const csv = 'materialId,quantity,note\nm1,10,Opening\nm2,20,';
    mockInventory.applyDelta.mockResolvedValue({ id: 'tx1' });
    const result = await service.bulkImport('t1', 's1', 'u1', csv);
    expect(result.imported).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(mockInventory.applyDelta).toHaveBeenCalledTimes(2);
    expect(mockInventory.applyDelta).toHaveBeenCalledWith(
      't1', 's1', 'm1', 10, InventoryTransactionType.INITIAL_IMPORT, 'u1', 'Opening',
    );
  });

  it('bulkImport collects row errors and continues with valid rows', async () => {
    const csv = 'materialId,quantity,note\nm1,bad,Test\nm2,20,Good';
    mockInventory.applyDelta.mockResolvedValue({ id: 'tx1' });
    const result = await service.bulkImport('t1', 's1', 'u1', csv);
    expect(result.imported).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(2);
  });

  it('bulkImport captures applyDelta errors in result', async () => {
    const csv = 'materialId,quantity,note\nm1,10,Test';
    mockInventory.applyDelta.mockRejectedValue(new Error('Material not found'));
    const result = await service.bulkImport('t1', 's1', 'u1', csv);
    expect(result.imported).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('Material not found');
  });
});
