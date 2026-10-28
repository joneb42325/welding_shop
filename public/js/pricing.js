export function calculateDynamicPrice(item, quantity) {
  const qty = parseFloat(quantity) || 1;
  const threshold = parseInt(item.wholesale_threshold) || 50;
  // Базовая розничная цена
  const retail = parseFloat(item.price_retail) || parseFloat(item.price) || 0;
  const wholesale = parseFloat(item.price_wholesale) || 0;
  const cutFee = item.cut_fee !== undefined ? parseFloat(item.cut_fee) : 40;

  // Поля markup_tier считываем как процент скидки
  const d1 = item.markup_tier1 !== undefined ? parseFloat(item.markup_tier1) : 0.0;
  const d2 = item.markup_tier2 !== undefined ? parseFloat(item.markup_tier2) : 0.15;
  const d3 = item.markup_tier3 !== undefined ? parseFloat(item.markup_tier3) : 0.35;

  let discount = 0;

  if (qty >= 1 && qty < 5) {
    discount = d1;
  } else if (qty >= 5 && qty < 10) {
    discount = d2;
  } else if (qty >= 10 && qty < threshold) {
    discount = d3;
  } else if (qty >= 50) {
    if (wholesale > 0 && wholesale < retail) {
      discount = (retail - wholesale) / retail;
    } else {
      discount = 0.5;
    }
  }

  // Скидочная формула
  const pricePerKg = Number((retail * (1 - discount)).toFixed(2));
  const totalPrice = Math.round(qty * pricePerKg + cutFee);

  return {
    pricePerKg,
    totalPrice,
    cutFee,
    discountPercent: Math.round(discount * 100),
  };
}
