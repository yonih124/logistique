import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/prisma.js';
import { creerDemandeComplete } from '../src/services/liste_demande_service.js';
import { notificationEvents } from '../src/services/notification_service.js';

test('Une notification de demande est émise uniquement après un enregistrement réussi', async t => {
  const original = prisma.$transaction;
  let sent = 0;
  const listener = () => { sent++ };
  notificationEvents.on('request', listener);
  t.after(() => { prisma.$transaction = original; notificationEvents.off('request', listener) });
  prisma.$transaction = async () => { throw new Error('rollback') };
  await assert.rejects(creerDemandeComplete({ id_utilisateur_im: 1 }, { Urgence: 'NORMALE', produits: [] }));
  assert.equal(sent, 0);
  prisma.$transaction = async () => ({ id_demande_client: 123 });
  const result = await creerDemandeComplete({ id_utilisateur_im: 1 }, { Urgence: 'NORMALE', produits: [] });
  assert.equal(sent, 1);
  assert.equal(result.id_demande_client, 123);
});
