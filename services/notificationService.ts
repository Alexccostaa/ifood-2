
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const sendLocalNotification = (title: string, body: string) => {
  if (Notification.permission === 'granted') {
    const options = {
      body,
      icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968744.png', // iFood-like red icon
      badge: 'https://cdn-icons-png.flaticon.com/512/5968/5968744.png',
      tag: 'ifood-monitor-alert',
      renotify: true,
    };
    new Notification(title, options);
  }
};
