// Service Worker for Push Notifications
// This file handles push events from the browser

self.addEventListener('push', (event) => {
  if (!event.data) return
  
  try {
    const data = event.data.json()
    const options = {
      body: data.body || '',
      icon: '/findMeLogo.svg',
      badge: '/findMeLogo.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.title || 'notification',
      },
      actions: [
        { action: 'view', title: 'Ver' },
        { action: 'dismiss', title: 'Cerrar' },
      ],
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'FindMe', options)
    )
  } catch (error) {
    console.error('Push event error:', error)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'view') {
    clients.openWindow('/')
  }
})

self.addEventListener('install', (event) => {
  console.log('Service Worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated')
  event.waitUntil(clients.claim())
})