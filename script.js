// تحميل الأدوية من التخزين المحلي
let medications = JSON.parse(localStorage.getItem('medications')) || [];
let alertedToday = {};

const medForm = document.getElementById('medForm');
const medsList = document.getElementById('medsList');
const enableNotifBtn = document.getElementById('enableNotif');
const alertModal = document.getElementById('alertModal');
const alertMedName = document.getElementById('alertMedName');
const alertMedDose = document.getElementById('alertMedDose');
const takenBtn = document.getElementById('takenBtn');

// ===== تفعيل الإشعارات =====
enableNotifBtn.addEventListener('click', async () => {
    if (!('Notification' in window)) {
        alert('متصفحك لا يدعم الإشعارات');
        return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        enableNotifBtn.textContent = '✅ الإشعارات مُفعّلة';
        enableNotifBtn.classList.add('enabled');
        new Notification('💊 مُذكِّر الأدوية', {
            body: 'ممتاز! سنُذكِّرك بأدويتك في أوقاتها.',
            icon: '💊'
        });
    }
});

if ('Notification' in window && Notification.permission === 'granted') {
    enableNotifBtn.textContent = '✅ الإشعارات مُفعّلة';
    enableNotifBtn.classList.add('enabled');
}

// ===== إضافة دواء جديد =====
medForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newMed = {
        id: Date.now(),
        name: document.getElementById('medName').value.trim(),
        dose: document.getElementById('medDose').value.trim(),
        time: document.getElementById('medTime').value,
        notes: document.getElementById('medNotes').value.trim()
    };
    medications.push(newMed);
    saveMeds();
    renderMeds();
    medForm.reset();
    speak(`تمت إضافة دواء ${newMed.name} بنجاح`);
});

function renderMeds() {
    if (medications.length === 0) {
        medsList.innerHTML = '<p class="empty-msg">لا توجد أدوية مضافة بعد. أضف أول دواء من الأعلى 👆</p>';
        return;
    }
    medications.sort((a, b) => a.time.localeCompare(b.time));
    medsList.innerHTML = medications.map(med => `
        <div class="med-card">
            <div class="med-info">
                <h3>💊 ${med.name}</h3>
                <p>📏 <strong>الجرعة:</strong> ${med.dose}</p>
                ${med.notes ? `<p>📝 <strong>ملاحظات:</strong> ${med.notes}</p>` : ''}
            </div>
            <div class="med-time">🕐 ${formatTime(med.time)}</div>
            <button class="btn-delete" onclick="deleteMed(${med.id})">🗑️ حذف</button>
        </div>
    `).join('');
}

function deleteMed(id) {
    if (confirm('هل أنت متأكد من حذف هذا الدواء؟')) {
        medications = medications.filter(m => m.id !== id);
        saveMeds();
        renderMeds();
    }
}

function saveMeds() {
    localStorage.setItem('medications', JSON.stringify(medications));
}

function formatTime(time24) {
    const [h, m] = time24.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'مساءً' : 'صباحاً';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
}

function checkMedications() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayKey = now.toDateString();

    medications.forEach(med => {
        if (med.time === currentTime) {
            const alertKey = `${todayKey}-${med.id}-${currentTime}`;
            if (!alertedToday[alertKey]) {
                alertedToday[alertKey] = true;
                triggerAlert(med);
            }
        }
    });
}

function triggerAlert(med) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notif = new Notification('💊 حان موعد دوائك!', {
            body: `${med.name} - ${med.dose}${med.notes ? ' (' + med.notes + ')' : ''}`,
            icon: 'https://cdn-icons-png.flaticon.com/512/2913/2913136.png',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200]
        });
        notif.onclick = () => {
            window.focus();
            notif.close();
        };
    }

    const message = `تنبيه! حان موعد دوائك ${med.name}. قم بتناول ${med.dose} الآن`;
    speak(message);
    setTimeout(() => speak(message), 3500);
    playBeep();

    alertMedName.textContent = `💊 ${med.name}`;
    alertMedDose.textContent = `الجرعة: ${med.dose}${med.notes ? ' - ' + med.notes : ''}`;
    alertModal.classList.remove('hidden');
}

function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ar-SA';
    utter.rate = 0.9;
    utter.pitch = 1;
    utter.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
    if (arabicVoice) utter.voice = arabicVoice;
    window.speechSynthesis.speak(utter);
}

function playBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const playTone = (freq, delay) => {
            setTimeout(() => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);
            }, delay);
        };
        playTone(800, 0);
        playTone(1000, 300);
        playTone(800, 600);
    } catch (e) {
        console.log('تعذر تشغيل الصوت');
    }
}

takenBtn.addEventListener('click', () => {
    alertModal.classList.add('hidden');
    window.speechSynthesis.cancel();
    speak('أحسنت! تناولت دوائك. نتمنى لك الصحة والعافية');
});

renderMeds();
setInterval(checkMedications, 30000);
setTimeout(checkMedications, 1000);

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
