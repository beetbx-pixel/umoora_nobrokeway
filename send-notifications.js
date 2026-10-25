const admin = require('firebase-admin');

// Читаем ключ, который мы спрятали в секретах GitHub
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkDebtsAndNotify() {
  try {
    // Получаем всех пользователей (у тебя там только один - ты)
    const usersSnapshot = await db.collection('users').get();
    
    for (const doc of usersSnapshot.docs) {
      const state = doc.data().data;
      if (!state || !state.fcmToken) continue; // Если пуши не включены — пропускаем

      const debts = state.debts || [];
      const leadDays = state.settings?.reminderLeadDays || 3;
      
      const today = new Date();
      today.setHours(0,0,0,0);

      for (const d of debts) {
        if (d.current <= 0 || !d.dueDay) continue;

        // Считаем дату следующего платежа
        let due = new Date(today.getFullYear(), today.getMonth(), d.dueDay);
        if (due < today) due.setMonth(due.getMonth() + 1);
        
        const dateStr = due.toISOString().slice(0, 10);
        if ((d.paidCycles || []).includes(dateStr)) continue; // Если уже оплачено — пропускаем

        const daysUntil = Math.round((due - today) / 86400000);
        
        // Если сегодня ровно тот день, когда нужно напомнить
        if (daysUntil === leadDays) {
          const amount = Math.round(d.minPayment || d.current);
          const message = {
            token: state.fcmToken,
            notification: {
              title: '🔔 Скоро платёж!',
              body: `Через ${leadDays} дн. нужно внести ~${amount.toLocaleString('ru-RU')} ₽ по долгу «${d.name}».`
            }
          };

          await admin.messaging().send(message);
          console.log(`Уведомление отправлено по долгу: ${d.name}`);
        }
      }
    }
  } catch (error) {
    console.error('Ошибка робота:', error);
  }
}

checkDebtsAndNotify();
