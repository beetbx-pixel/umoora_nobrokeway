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
        
                // Если осталось от 0 до 5 дней (включительно) — отправляем пуш
        if (daysUntil <= leadDays && daysUntil >= 0) {
          const amount = Math.round(d.minPayment || d.current);
          
          // Красиво склоняем слова
          let daysText = '';
          if (daysUntil === 0) {
            daysText = 'Сегодня';
          } else if (daysUntil === 1) {
            daysText = 'Завтра';
          } else {
            const m10 = daysUntil % 10, m100 = daysUntil % 100;
            let word = 'дней';
            if (m10 === 1 && m100 !== 11) word = 'день';
            else if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) word = 'дня';
            daysText = `Через ${daysUntil} ${word}`;
          }

          const message = {
            token: state.fcmToken,
            notification: {
              title: '🔔 Скоро платёж!',
              body: `${daysText} нужно внести ~${amount.toLocaleString('ru-RU')} ₽ по долгу «${d.name}».`
            }
          };

          await admin.messaging().send(message);
          console.log(`Уведомление отправлено по долгу: ${d.name} (осталось дней: ${daysUntil})`);
        }
      }
    }
  } catch (error) {
    console.error('Ошибка робота:', error);
  }
}

checkDebtsAndNotify();
