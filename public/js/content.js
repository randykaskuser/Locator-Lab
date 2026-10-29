// Teaching content. Every locator string here is checked against real
// Playwright by tests/parity.mjs, so keep them runnable.

export const EXAMPLES = [
  "page.getByRole('button', { name: 'Sign in' })",
  "page.getByText('Sign in')",
  "page.getByRole('button', { name: 'Cart' })",
  "page.getByRole('button', { name: 'Cart', exact: true })",
  "page.getByRole('listitem').filter({ hasText: 'Toraja' }).getByRole('button')",
  "page.locator('.btn.add').nth(1)",
];

export const BREAK_DEFAULTS = [
  "page.locator('.btn.add').first()",
  "page.locator('//ul/li[1]/button')",
  "page.locator('#email')",
  "page.getByRole('button', { name: 'Add to cart' }).first()",
  "page.getByTestId('product-gayo').getByRole('button')",
  "page.getByRole('listitem').filter({ hasText: 'Arabica Gayo' }).getByRole('button', { name: 'Add to cart' })",
];

// Playwright's recommended order (https://playwright.dev/docs/locators).
export const LADDER = [
  {
    api: 'getByRole',
    good: "page.getByRole('button', { name: 'Sign in' })",
    bad: "page.locator('.btn-primary')",
    en: {
      when: 'Anything a user can interact with: buttons, links, headings, checkboxes, inputs.',
      why: 'Finds the element the way a user and a screen reader see it: by role and visible name. Survives class, id and layout changes.',
      badWhy: 'A styling class. One redesign or a CSS-modules build and it is gone.',
    },
    id: {
      when: 'Semua yang bisa diinteraksikan user: button, link, heading, checkbox, input.',
      why: 'Mencari elemen seperti user dan screen reader melihatnya: dari role dan nama yang terlihat. Tetap jalan walau class, id, dan layout berubah.',
      badWhy: 'Ini class untuk styling. Sekali redesign atau build CSS modules, class-nya hilang.',
    },
  },
  {
    api: 'getByLabel',
    good: "page.getByLabel('Password')",
    bad: "page.locator('#password')",
    en: {
      when: 'Form fields that have a <label>, aria-label or aria-labelledby.',
      why: 'Also checks that the field is labelled. If a developer removes the label, the test fails, and that is a real accessibility bug.',
      badWhy: 'IDs are often generated (React useId, form libraries). Stable today, random tomorrow.',
    },
    id: {
      when: 'Field form yang punya <label>, aria-label, atau aria-labelledby.',
      why: 'Sekaligus memastikan field punya label. Kalau developer menghapus label, test gagal, dan itu memang bug accessibility.',
      badWhy: 'ID sering di-generate (React useId, library form). Hari ini stabil, besok acak.',
    },
  },
  {
    api: 'getByPlaceholder',
    good: "page.getByPlaceholder('Search coffee')",
    bad: "page.locator('section:nth-of-type(2) > input')",
    en: {
      when: 'Inputs with no label, only a placeholder. Use it, then ask the team to add a label.',
      why: 'Uses text the user can see. Weaker than a label because placeholder text disappears while typing and often changes.',
      badWhy: 'Depends on section order and direct parent. Add one wrapper div and it breaks.',
    },
    id: {
      when: 'Input tanpa label, hanya placeholder. Pakai ini, lalu minta tim menambahkan label.',
      why: 'Memakai teks yang terlihat user. Lebih lemah dari label karena placeholder hilang saat mengetik dan sering diganti.',
      badWhy: 'Bergantung pada urutan section dan parent langsung. Tambah satu div pembungkus, langsung rusak.',
    },
  },
  {
    api: 'getByText',
    good: "page.getByText('Rp 85.000')",
    bad: "page.getByText('Sign in')",
    en: {
      when: 'Non-interactive content: messages, prices, empty states, toasts.',
      why: 'Matches the smallest element that contains the text. Good for asserting what the user reads.',
      badWhy: 'Matches the heading AND the button. Strict mode fails on click. For a button, use getByRole.',
    },
    id: {
      when: 'Konten non-interaktif: pesan, harga, empty state, toast.',
      why: 'Mencocokkan elemen terkecil yang berisi teks itu. Bagus untuk assert apa yang dibaca user.',
      badWhy: 'Cocok dengan heading DAN button. Strict mode gagal saat click. Untuk button, pakai getByRole.',
    },
  },
  {
    api: 'getByAltText',
    good: "page.getByAltText('Arabica Gayo beans')",
    bad: "page.locator('img').first()",
    en: {
      when: 'Images and image buttons with meaningful alt text.',
      why: 'Alt text is what a blind user hears. Testing it keeps it correct.',
      badWhy: 'The first image today may be a different product tomorrow. The test still passes, on the wrong thing.',
    },
    id: {
      when: 'Gambar dan tombol gambar yang punya alt text bermakna.',
      why: 'Alt text adalah yang didengar user tunanetra. Mengetesnya menjaga alt text tetap benar.',
      badWhy: 'Gambar pertama hari ini bisa jadi produk lain besok. Test tetap lolos, tapi di elemen yang salah.',
    },
  },
  {
    api: 'getByTitle',
    good: "page.getByTitle('2 items in cart')",
    bad: "page.locator('.badge')",
    en: {
      when: 'Elements whose only description is a title attribute (badges, icons).',
      why: 'Uses the tooltip text. Rarely the best choice; prefer a real label when you can.',
      badWhy: 'Class name again. It says how it looks, not what it is.',
    },
    id: {
      when: 'Elemen yang deskripsinya hanya atribut title (badge, ikon).',
      why: 'Memakai teks tooltip. Jarang jadi pilihan terbaik; lebih baik label sungguhan kalau bisa.',
      badWhy: 'Lagi-lagi nama class. Menjelaskan tampilan, bukan fungsi.',
    },
  },
  {
    api: 'getByTestId',
    good: "page.getByTestId('product-gayo').getByRole('button')",
    bad: "page.getByTestId('email-input')",
    en: {
      when: 'When text changes (translations, A/B copy) or there is no good role or name. Agree on test ids with developers.',
      why: 'An explicit contract between dev and QA. Survives copy changes and translations. Combine with getByRole inside it.',
      badWhy: 'Works, but the field has a perfectly good label. A test id here hides a missing-label bug and checks nothing a user sees.',
    },
    id: {
      when: 'Saat teks berubah (terjemahan, copy A/B) atau tidak ada role/nama yang bagus. Sepakati test id dengan developer.',
      why: 'Kontrak eksplisit antara dev dan QA. Tahan terhadap perubahan copy dan terjemahan. Gabungkan dengan getByRole di dalamnya.',
      badWhy: 'Jalan, tapi field ini sudah punya label yang bagus. Test id di sini menyembunyikan bug label hilang dan tidak mengecek apa pun yang dilihat user.',
    },
  },
  {
    api: 'locator (CSS / XPath)',
    good: "page.locator('li').filter({ hasText: 'Toraja Kalosi' })",
    bad: "page.locator('//main/section[2]/ul/li[3]/button')",
    en: {
      when: 'Last resort. Short CSS for structure that is part of the design (a list item), then narrow it with filter().',
      why: 'Fine when short and paired with text. Long chains describe the DOM tree, and the DOM tree is what changes most.',
      badWhy: 'Absolute XPath encodes every parent and position. Any layout change breaks it, or worse, points it at another element.',
    },
    id: {
      when: 'Pilihan terakhir. CSS pendek untuk struktur yang memang bagian desain (item list), lalu persempit dengan filter().',
      why: 'Aman kalau pendek dan dipasangkan dengan teks. Rantai panjang menggambarkan pohon DOM, dan pohon DOM-lah yang paling sering berubah.',
      badWhy: 'XPath absolut menyimpan setiap parent dan posisi. Perubahan layout apa pun merusaknya, atau lebih buruk, mengarahkannya ke elemen lain.',
    },
  },
];

export const QUIZ = [
  {
    target: { en: 'The "Sign in" submit button', id: 'Tombol submit "Sign in"' },
    markup: '<button type="submit" class="btn btn-primary">Sign in</button>',
    options: [
      "page.locator('.btn-primary')",
      "page.getByRole('button', { name: 'Sign in' })",
      "page.getByText('Sign in')",
    ],
    answer: 1,
    en: 'Role + name is how the user finds it. getByText also matches the "Sign in" heading, so a click fails in strict mode. .btn-primary is a style.',
    id: 'Role + nama adalah cara user menemukannya. getByText juga cocok dengan heading "Sign in", jadi click gagal di strict mode. .btn-primary hanyalah style.',
  },
  {
    target: { en: 'The password field', id: 'Field password' },
    markup: '<label for="password">Password</label>\n<input id="password" type="password">',
    options: [
      "page.locator('#password')",
      "page.getByRole('textbox').nth(1)",
      "page.getByLabel('Password')",
    ],
    answer: 2,
    en: 'getByLabel finds it by the text the user reads and proves the label exists. nth(1) breaks when a field is added above. The id breaks if it is generated.',
    id: 'getByLabel mencarinya dari teks yang dibaca user dan membuktikan label-nya ada. nth(1) rusak saat ada field baru di atasnya. ID rusak kalau di-generate.',
  },
  {
    target: { en: '"Add to cart" for Robusta Dampit', id: '"Add to cart" untuk Robusta Dampit' },
    markup: '<li data-testid="product-dampit">\n  <img alt="Robusta Dampit beans"> <h3>Robusta Dampit</h3>\n  <p class="price">Rp 60.000</p>\n  <button type="button" class="btn add">Add to cart</button>\n</li>',
    options: [
      "page.getByRole('button', { name: 'Add to cart' }).nth(1)",
      "page.getByRole('listitem').filter({ hasText: 'Robusta Dampit' }).getByRole('button', { name: 'Add to cart' })",
      "page.locator('//ul/li[2]/button')",
    ],
    answer: 1,
    en: 'Find the row by what makes it unique (the product name), then the button inside it. nth(1) and li[2] silently click another product when the list is re-sorted.',
    id: 'Cari baris dari yang membuatnya unik (nama produk), lalu button di dalamnya. nth(1) dan li[2] diam-diam meng-click produk lain saat list diurutkan ulang.',
  },
  {
    target: { en: 'The cart icon button in the header', id: 'Tombol ikon keranjang di header' },
    markup: '<button class="icon-btn" aria-label="Cart" data-testid="cart-button">\n  <svg aria-hidden="true">…</svg><span class="badge">2</span>\n</button>',
    options: [
      "page.getByRole('button', { name: 'Cart' })",
      "page.getByRole('button', { name: 'Cart', exact: true })",
      "page.locator('header button')",
    ],
    answer: 1,
    en: 'Trap: name matching is a case-insensitive substring by default, so "Cart" also matches the three "Add to cart" buttons. exact: true fixes it. "header button" breaks when a second header button is added.',
    id: 'Jebakan: pencocokan nama default-nya substring tanpa peduli huruf besar/kecil, jadi "Cart" juga cocok dengan tiga button "Add to cart". exact: true memperbaikinya. "header button" rusak saat ada button kedua di header.',
  },
  {
    target: { en: 'The search box', id: 'Kotak pencarian' },
    markup: '<input type="search" class="search" placeholder="Search coffee">',
    options: [
      "page.getByPlaceholder('Search coffee')",
      "page.locator('input').last()",
      "page.getByLabel('Search coffee')",
    ],
    answer: 0,
    en: 'There is no label, so getByLabel finds nothing. A placeholder is the only visible text, so use it (and report the missing label). last() depends on order.',
    id: 'Tidak ada label, jadi getByLabel tidak menemukan apa-apa. Placeholder satu-satunya teks yang terlihat, jadi pakai itu (dan laporkan label yang hilang). last() bergantung pada urutan.',
  },
  {
    target: { en: 'The price of Toraja Kalosi', id: 'Harga Toraja Kalosi' },
    markup: '<li data-testid="product-kalosi">\n  … <h3>Toraja Kalosi</h3>\n  <p class="price">Rp 95.000</p> …\n</li>',
    options: [
      "page.locator('.price').nth(2)",
      "page.getByTestId('product-kalosi').getByText(/^Rp/)",
      "page.getByText('Rp')",
    ],
    answer: 1,
    en: 'Scope to the product first, then match the text pattern. getByText("Rp") matches all three prices. .price + nth(2) breaks on re-sort and on a class rename.',
    id: 'Persempit ke produknya dulu, lalu cocokkan pola teksnya. getByText("Rp") cocok dengan ketiga harga. .price + nth(2) rusak saat urutan berubah dan saat class diganti.',
  },
  {
    target: { en: 'The email field. The app ships in English and Indonesian.', id: 'Field email. Aplikasinya tersedia dalam bahasa Inggris dan Indonesia.' },
    markup: '<label for="email">Email</label>\n<input id="email" type="email" placeholder="you@example.com" data-testid="email-input">',
    options: [
      "page.getByTestId('email-input')",
      "page.getByLabel('Email')",
      "page.locator('form input').first()",
    ],
    answer: 1,
    en: 'The label is "Email" in both languages, so getByLabel survives translation and still checks the label. The test id works too, but skips that check. Try the "Shop text in ID" refactor to see it.',
    id: 'Label-nya "Email" di kedua bahasa, jadi getByLabel tetap jalan setelah diterjemahkan dan tetap mengecek label. Test id juga jalan, tapi melewatkan pengecekan itu. Coba refactor "Teks toko ke ID" untuk melihatnya.',
  },
  {
    target: { en: 'The "Remember me" checkbox', id: 'Checkbox "Remember me"' },
    markup: '<label class="check"><input type="checkbox"> Remember me</label>',
    options: [
      "page.getByRole('checkbox', { name: 'Remember me' })",
      "page.locator('input[type=checkbox]')",
      "page.getByText('Remember me')",
    ],
    answer: 0,
    en: 'getByText returns the <label>. It still works, because Playwright follows a label to its control for check() and toBeChecked(). But it never checks that a checkbox exists, and any help text containing "Remember me" makes it ambiguous. getByRole says exactly what you mean. The CSS selector breaks when a second checkbox appears.',
    id: 'getByText mengembalikan <label>. Tetap jalan, karena Playwright mengikuti label ke kontrolnya untuk check() dan toBeChecked(). Tapi tidak pernah memastikan checkbox-nya ada, dan teks bantuan apa pun yang mengandung "Remember me" membuatnya ambigu. getByRole menyatakan persis maksudnya. Selector CSS rusak saat muncul checkbox kedua.',
  },
];
