export function applyNotificationEvent(items, event) {
  if (event.type === 'notification:new' && event.data?.id) {
    return [event.data, ...items.filter(item => item.id !== event.data.id)].sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  if (event.type === 'notification:read' && event.data) {
    return items.filter(item => !(item.type === 'message' && item.conversationId === event.data.conversationId && item.messageId <= event.data.lastMessageId));
  }
  if (event.type === 'notification:remove') return items.filter(item => item.id !== event.data?.id);
  return items;
}
