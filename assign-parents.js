const db = require('./db');

const DRY_RUN = false; // Сначала смотрим в консоли, потом ставим false

function queryAsync(sql, params = []) {
  if (typeof db.promise === 'function') {
    return db.promise().query(sql, params);
  }
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows, fields) => {
      if (err) return reject(err);
      resolve([rows, fields]);
    });
  });
}

function getLineKey(product) {
  let name = String(product.name || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/і/g, 'і');

  // Чиним частые опечатки
  name = name.replace(/діамерт/g, 'діаметр');

  // Нормализуем марки
  name = name
    .replace(/\bано[\s-]+(\d+)/gi, 'ано$1')
    .replace(/\bмр[\s-]+(\d+)/gi, 'мр$1')
    .replace(/уоні[\s-]*13\s*\/\s*55/gi, 'уоні1355')
    .replace(/er\s*308\s*l\s*si/gi, 'er308lsi')
    .replace(/er\s*309\s*l/gi, 'er309l')
    .replace(/er\s*316\s*l/gi, 'er316l')
    .replace(/er\s*70\s*s\s*-\s*6/gi, 'er70s6')
    .replace(/св\s*08\s*г\s*2\s*с/gi, 'св08г2с')
    .replace(/е\s*71\s*т[\s-]*gs/gi, 'е71тgs');

  const isOpt = /оптовий продаж|тільки бухтами|від\s*\d+\s*кг/i.test(name);

  // Убираем слова-параметры, диаметры, веса и единицы измерения
  name = name
    .replace(/оптовий продаж|тільки бухтами|від\s*\d+\s*кг|виробник/gi, ' ')
    .replace(
      /діаметр|диаметр|вага|вес|фасування|катушка|бухта|бухтах|бухтами|упаковка|пачка|пруток|прутки|дріт|в бухті|в бухтах|на каркасі|на пластику/gi,
      ' '
    )
    .replace(
      /\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(мм|mm|см|cm|м|m|кг|kg|г|g|шт|пач)/gi,
      ' '
    );

  // Удаляем точные значения diameter и weight товара, если они написаны отдельно
  for (const field of [product.diameter, product.weight]) {
    if (field !== null && field !== undefined && String(field).trim() !== '') {
      const esc = String(field)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/[.,]/g, '[.,]');
      name = name.replace(new RegExp(`(?<![\\d.,])${esc}(?![\\d.,])`, 'g'), ' ');
    }
  }

  const clean = name
    .replace(/[^a-zа-яіїєґ0-9]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${clean || 'item'}${isOpt ? '_opt' : ''}`;
}

async function run() {
  const [rows] = await queryAsync(
    'SELECT id, name, diameter, weight, manufacturer_id, category_id FROM products ORDER BY id ASC'
  );

  const groups = new Map();
  for (const p of rows) {
    const key = getLineKey(p);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  let linesCount = 0;
  for (const [key, items] of groups.entries()) {
    if (items.length < 2) continue;
    linesCount++;
    const parentId = items[0].id;
    console.log(`\n[ЛИНЕЙКА: ${key}] parent_id=${parentId} (${items.length} шт.)`);
    for (const item of items) {
      console.log(
        `  #${item.id} | mfg=${item.manufacturer_id} | d=${item.diameter} | w=${item.weight} | "${item.name}"`
      );
    }

    if (!DRY_RUN) {
      const ids = items.map((i) => i.id);
      await queryAsync('UPDATE products SET parent_id = ? WHERE id IN (?)', [parentId, ids]);
    }
  }

  console.log(`\nНайдено линеек с 2+ товарами: ${linesCount}`);
  console.log(DRY_RUN ? 'DRY_RUN=true: БД не менялась.' : '✅ parent_id записаны.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
