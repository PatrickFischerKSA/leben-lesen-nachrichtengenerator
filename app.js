const form = document.querySelector('#details');
const preview = document.querySelector('#message');
const status = document.querySelector('#status');
const copyButton = document.querySelector('.copy');
const requiredFields = {
  topic: 'Bitte wähle ein Thema aus.',
  members: 'Bitte trage die Adressat*innen ein.',
  organiser: 'Bitte gib deinen Vor- und Nachnamen ein.',
  phone: 'Bitte gib eine Mobiltelefonnummer ein.',
  slot: 'Bitte wähle ein Zeitfenster aus.',
  place: 'Bitte gib einen Treffpunkt ein.',
};
const greetingList = new Intl.ListFormat('de-CH');
const channelList = new Intl.ListFormat('de-CH', { type: 'disjunction' });
let validationActive = false;
let revision = 0;

function value(name) {
  return form.elements.namedItem(name).value.trim();
}

function renderMessage() {
  const organiser = value('organiser') || '[dein Name]';
  const partner = value('partner');
  const names = partner ? organiser + ' und ' + partner : organiser;
  const members = value('members').split(/\r?\n/).map(name => name.trim()).filter(Boolean);
  const channels = new FormData(form).getAll('channel');
  const question = channels.length
    ? 'Kommt für euch ' + channelList.format(channels) + ' infrage?'
    : 'Welche Möglichkeit passt euch am besten?';
  const extra = value('extra');

  preview.value = [
    members.length ? 'Hoi ' + greetingList.format(members.map(name => name.replace(/\s*\(FM[123]\)$/i, '').trim() || name)) + '!' : 'Hoi zäme!',
    (partner ? 'Wir sind ' : 'Ich bin ') + names + ' aus der FM2 und ' +
      (partner ? 'übernehmen' : 'übernehme') +
      ' die Koordination unserer Projektgruppe beim FMS-Kreativprojekt «Leben lesen».',
    'Unser Thema ist «' + (value('topic') || '[Thema]') + '».',
    'Zu unserer Gruppe gehören:\n' +
      (members.length ? members.map(name => '• ' + name).join('\n') : '• [Namen der Gruppenmitglieder]'),
    'Auf der Projektwebsite findet ihr Informationen und Anregungen zu unserem Thema:\n' +
      'https://leben-lesen-fms.patrickoliverfischer.chatgpt.site/',
    'Bitte schaut euch bis Mittwoch, 18. November, die Informationen zu unserem Thema kurz an und überlegt euch erste kreative Projektideen. Vielleicht entsteht daraus ein Kurzfilm, ein Spiel, eine Collage, eine Installation, eine Performance oder etwas ganz anderes.',
    'Unser erstes Gruppentreffen\nDatum: Mittwoch, 18. November 2026\nZeit: ' +
      (value('slot') || '[Zeitfenster]') + '\nTreffpunkt: ' + (value('place') || '[Treffpunkt]'),
    'Wir haben rund 20 Minuten, um uns kennenzulernen, Ideen auszutauschen und möglichst eine gemeinsame Projektidee festzulegen. Wir verteilen erste Aufgaben und besprechen, wie wir in den kommenden Wochen zusammenarbeiten.',
    'Wir arbeiten bis Freitag, 18. Dezember 2026, an unserem Projekt. An diesem Vormittag stellen wir es fertig. Am Nachmittag präsentieren wir es und eine Jury begutachtet die Projekte.',
    'Wie wollen wir uns während der Projektphase am einfachsten austauschen? ' +
      question + ' Schreibt doch kurz, was euch am besten passt oder welche andere Idee ihr habt.',
    'Falls ihr Fragen habt, könnt ihr euch bei mir melden:\n' + organiser + ' – ' +
      (value('phone') || '[Telefonnummer]'),
    ...(extra ? [extra] : []),
    (partner ? 'Wir freuen uns' : 'Ich freue mich') +
      ' auf eure Ideen und auf ein spannendes gemeinsames Projekt!',
    'Liebe Grüsse\n' + names,
  ].join('\n\n');
}

function validate() {
  let firstInvalid = null;
  for (const [name, requiredMessage] of Object.entries(requiredFields)) {
    const field = form.elements.namedItem(name);
    const input = value(name);
    const errorId = name + '-error';
    let error = document.getElementById(errorId);
    const descriptions = (field.getAttribute('aria-describedby') || '').split(/\s+/)
      .filter(id => id && id !== errorId);
    let message = validationActive && !input ? requiredMessage : '';
    if (validationActive && name === 'phone' && input &&
      !/^(?:0|\+41|0041)7[5-9]\d{7}$/.test(input.replace(/[\s().-]/g, ''))) {
      message = 'Bitte gib eine Schweizer Mobiltelefonnummer ein, z. B. 079 123 45 67 oder +41 79 123 45 67.';
    }

    if (message) {
      firstInvalid ??= field;
      if (!error) {
        error = document.createElement('p');
        error.id = errorId;
        error.className = 'error';
        field.after(error);
      }
      error.textContent = message;
      field.setAttribute('aria-invalid', 'true');
      descriptions.push(errorId);
    } else {
      error?.remove();
      field.removeAttribute('aria-invalid');
    }
    if (descriptions.length) {
      field.setAttribute('aria-describedby', descriptions.join(' '));
    } else {
      field.removeAttribute('aria-describedby');
    }
  }
  return firstInvalid;
}

function update() {
  revision++;
  status.textContent = '';
  renderMessage();
  if (validationActive) validate();
}

function selectMessage() {
  preview.focus();
  preview.select();
}

form.addEventListener('input', update);
form.addEventListener('reset', () => {
  validationActive = false;
  validate();
  setTimeout(() => {
    update();
    form.elements.namedItem('topic').focus();
  }, 0);
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  validationActive = true;
  const firstInvalid = validate();
  if (firstInvalid) {
    status.textContent = 'Bitte ergänze oder korrigiere die markierten Angaben.';
    firstInvalid.focus();
    return;
  }
  const submittedRevision = revision;
  const message = preview.value;
  let copied = false;
  try {
    await navigator.clipboard.writeText(message);
    copied = true;
  } catch {
    if (submittedRevision !== revision) return;
    selectMessage();
    try {
      copied = document.execCommand('copy');
    } catch {
      // The selected text stays available for manual copying.
    }
    if (copied) copyButton.focus();
  }
  if (submittedRevision === revision) {
    status.textContent = copied
      ? 'Nachricht kopiert. Füge sie jetzt unverändert in euren Teams-Gruppenchat ein.'
      : 'Die Nachricht ist markiert. Kopiere sie über das Menü deines Geräts oder mit Strg+C bzw. ⌘C.';
  }
});

renderMessage();
