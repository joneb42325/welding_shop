export function calculateDynamicPrice(item, quantity) {
  const qty = Math.max(1, parseFloat(quantity) || 1);

  const threshold = Math.max(1, parseInt(item.wholesale_threshold, 10) || 50);
  // Базовая розничная цена
  const retail = parseFloat(item.price_retail) || parseFloat(item.price) || 0;
  const wholesale = parseFloat(item.price_wholesale) || 0;
  const cutFee =
    item.cut_fee !== undefined && item.cut_fee !== null
      ? Math.max(0, parseFloat(item.cut_fee) || 0)
      : 40;

  // Поля markup_tier считываем как процент скидки
  const d1 = item.markup_tier1 !== undefined ? parseFloat(item.markup_tier1) : 0.0;
  const d2 = item.markup_tier2 !== undefined ? parseFloat(item.markup_tier2) : 0.15;
  const d3 = item.markup_tier3 !== undefined ? parseFloat(item.markup_tier3) : 0.35;

  let pricePerUnit = retail;
  let discount = 0;
  let appliedCutFee = cutFee;

  if (qty >= threshold) {
    pricePerUnit = wholesale > 0 ? wholesale : retail;
    appliedCutFee = 0;
  } else if (qty >= 10) {
    discount = d3;
  } else if (qty >= 5) {
    discount = d2;
  } else {
    discount = d1;
  }

  if (qty < threshold) {
    pricePerUnit = Number((retail * (1 - discount)).toFixed(2));
  }

  const totalPrice = Math.round(qty * pricePerUnit + appliedCutFee);

  return {
    pricePerKg: pricePerUnit,
    totalPrice,
    cutFee: appliedCutFee,
    discountPercent: retail > 0 ? Math.round((1 - pricePerUnit / retail) * 100) : 0,
  };
}
