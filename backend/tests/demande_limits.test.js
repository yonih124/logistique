import test from 'node:test';
import assert from 'node:assert/strict';
import { baseValidation, proposerQuantites } from '../src/services/demande_limit_service.js';
import { catalogueSchemas, confirmerDemandeSchema } from '../src/validators/crud.validator.js';
import { prisma } from '../src/config/prisma.js';
import { confirmerDemande } from '../src/services/validation_demande_service.js';

const article = (stock, percent) => ({ id_catalogue: 1, designation: 'Papier', pourcentage_demande_max: percent, Stock: stock.map(quantite_stock => ({ quantite_stock })) });
test('Dérogation possible au-delà des 10 demandés, mais jamais au-delà du stock', async t => {
  const updates = [];
  const tx = {
    demande_client: {
      findUnique: async () => ({ status_demande: 'ENVOYER', Liste_demande: [{ id_liste_demande: 1, id_catalogue: 1, quantite_liste_demande: 10, Catalogue: { designation: 'Papier' } }] }),
      updateMany: async () => ({ count: 1 }),
    },
    stock: { findMany: async () => [{ id_stock: 1, quantite_stock: 100 }], update: async args => updates.push(args) },
    liste_demande: { update: async args => updates.push(args) },
  };
  const original = prisma.$transaction;
  prisma.$transaction = async callback => callback(tx);
  t.after(() => { prisma.$transaction = original; });
  const decision = quantite_accordee => [{ id_liste_demande: 1, status: 'MODIFIER', quantite_accordee }];
  await confirmerDemande(1, decision(20));
  assert.equal(updates[0].data.quantite_stock.decrement, 20);
  assert.equal(updates[1].data.pourcentage_accorde, null);
  updates.length = 0;
  await assert.rejects(confirmerDemande(1, decision(101)), { statusCode: 409 });
  assert.equal(updates.length, 0);
});
test('Plafond calculé sur le stock cumulé et arrondi vers le bas', () => {
  assert.equal(baseValidation(article([40, 60], 10)), 10);
  assert.equal(baseValidation(article([95], 10)), 9);
  assert.equal(baseValidation(article([0], 100)), 0);
  assert.equal(baseValidation(article([100], 0)), 0);
});
test('La proposition utilise le pourcentage sans multiplier la base par les lignes', () => {
  const line = quantity => ({ id_catalogue: 1, quantite_liste_demande: quantity, Catalogue: article([100], 10) });
  assert.deepEqual(proposerQuantites([line(6), line(20)]).map(x => x.quantite_proposee), [6, 4]);
  assert.equal(proposerQuantites([line(50)])[0].quantite_proposee, 10);
  assert.equal(proposerQuantites([line(2)])[0].quantite_proposee, 2);
});
test('Le plafond est borné, la validation ne nécessite plus le pourcentage accordé', () => {
  assert.equal(catalogueSchemas.update.safeParse({ params: { id: 1 }, body: { pourcentage_demande_max: 101 } }).success, false);
  assert.equal(confirmerDemandeSchema.safeParse({ params: { id: 1 }, body: { decisions: [{ id_liste_demande: 1, status: 'MODIFIER', quantite_accordee: 20 }] } }).success, true);
});
