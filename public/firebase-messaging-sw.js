self.addEventListener('notificationclick', (event) => {
  event.preventDefault();

  const url = event.notification?.data?.url || '/';
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  }).then((windowClients) => {
    const matchingClient = windowClients.find((client) => 'focus' in client && client.url.includes(location.origin));

    if (matchingClient) {
      return (matchingClient as WindowClient).focus();
    }

    return clients.openWindow(url);
  });

  event.waitUntil(promiseChain);
  event.notification.close();
});
