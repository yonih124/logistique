import test from 'node:test';
import assert from 'node:assert/strict';
import { applyNotificationEvent } from '../../frontend/src/services/notificationState.js';
import { messageNotification, requestNotification } from '../src/services/notification_service.js';

test('Les données WebSocket suffisent pour ajouter une notification sans requête HTTP', () => {
  const data = messageNotification({ id_message: 10, id_conversation: 2, date_message: '2026-09-14T10:00:00Z', contenu: 'Bonjour', Utilisateur: { nom_complet: 'Client' } });
  const event = { type: 'notification:new', data };
  const items = applyNotificationEvent([], event);
  assert.equal(items[0].title, 'Message de Client');
  assert.equal(items[0].text, 'Bonjour');
  assert.equal(applyNotificationEvent(items, event).length, 1);
  assert.equal(applyNotificationEvent(items, { type: 'notification:read', data: { conversationId: 3, lastMessageId: 10 } }).length, 1);
  assert.equal(applyNotificationEvent(items, { type: 'notification:read', data: { conversationId: 2, lastMessageId: 10 } }).length, 0);
});

test('Les événements arrivés pendant le chargement sont conservés et une demande traitée disparaît', () => {
  const data = requestNotification({ id_demande_client: 1, date_demande: '2026-09-14T10:00:00Z', Utilisateur: { nom_complet: 'Client' } });
  const events = [{ type: 'notification:new', data }, { type: 'notification:remove', data: { id: data.id } }];
  assert.deepEqual(events.reduce(applyNotificationEvent, []), []);
  assert.equal(events.slice(0, 1).reduce(applyNotificationEvent, []).length, 1);
});
