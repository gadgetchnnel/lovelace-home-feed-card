export function subscribeNotifications (conn, onChange)
{
  const params = {
    type: "persistent_notification/subscribe",
  };
  
  const subscription = conn.subscribeMessage(
    (message) => onChange(),
    params
  );
  
  return () => {
    subscription.then((unsub) => unsub());
  };
};