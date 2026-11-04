import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/prisma.js';
import { correctStock } from '../src/services/modification_stock_service.js';

test('correction tracée et protection contre les valeurs périmées', async () => {
  const transaction = prisma.$transaction;
  let written = false;
  let audit;
  prisma.$transaction = async (callback, options) => {
    assert.equal(options.isolationLevel, 'Serializable');
    return callback({
      stock: {
        findUnique: async () => ({ id_stock: 1, quantite_stock: 10 }),
        updateMany: async ({ where, data }) => {
          assert.equal(where.quantite_stock, 10);
          assert.equal(data.quantite_stock, 0);
          written = true;
          return { count: 1 };
        },
      },
      modification_stock: { create: async ({ data }) => { audit = data; return data; } },
    });
  };
  try {
    await assert.rejects(correctStock(1, { quantite_avant: 9, quantite_apres: 0, motif: 'Inventaire' }), { statusCode: 409 });
    assert.equal(written, false);
    await assert.rejects(correctStock(1, { quantite_avant: 10, quantite_apres: 10, motif: 'Inventaire' }), { statusCode: 400 });
    await correctStock(1, { quantite_avant: 10, quantite_apres: 0, motif: 'Inventaire' });
    assert.deepEqual(audit, { id_stock: 1, quantite_avant: 10, quantite_apres: 0, motif: 'Inventaire' });
  } finally { prisma.$transaction = transaction; await prisma.$disconnect(); }
});
