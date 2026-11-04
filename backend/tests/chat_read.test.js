import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/prisma.js';
import { markConversationRead } from '../src/services/chat_service.js';
import { notificationEvents } from '../src/services/notification_service.js';

test('Lecture limitée aux messages reçus et affichés dans une conversation autorisée', async t => {
  const originalFind = prisma.conversation.findFirst;
  const originalUpdate = prisma.message.updateMany;
  t.after(() => { prisma.conversation.findFirst = originalFind; prisma.message.updateMany = originalUpdate });
  let authorized = false;
  let changes = 0;
  let notified;
  const listener = id => { notified = id };
  notificationEvents.on('read', listener);
  t.after(() => notificationEvents.off('read', listener));
  prisma.conversation.findFirst = async query => {
    assert.equal(query.where.OR[0].id_utilisateur_im, 7);
    return authorized ? { id_conversation: 2 } : null;
  };
  prisma.message.updateMany = async query => {
    assert.deepEqual(query.where, { id_conversation: 2, id_message: { lte: 10 }, id_utilisateur_im: { not: 7 }, status_message: { not: 'LU' } });
    assert.equal(query.data.status_message, 'LU');
    changes++;
    return { count: 1 };
  };
  await assert.rejects(markConversationRead({ id_utilisateur_im: 7 }, 2, 10), { statusCode: 404 });
  assert.equal(changes, 0);
  authorized = true;
  await markConversationRead({ id_utilisateur_im: 7 }, 2, 10);
  assert.equal(changes, 1);
  assert.equal(notified, 7);
  await assert.rejects(markConversationRead({ id_utilisateur_im: 7 }, 2, -1), { statusCode: 400 });
});
