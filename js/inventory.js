(function () {
  const calculateInventoryValue = (products) => {
    return products.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  };

  const countLowStock = (products, threshold = 5) => {
    return products.filter(p => Number(p.quantity) < threshold).length;
  };

  const summarizeSalesByMonth = (invoices) => {
    const map = {};
    invoices.forEach(inv => {
      const date = new Date(inv.date);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!map[key]) map[key] = 0;
      (inv.items || []).forEach(it => map[key] += Number(it.quantity) || 0);
    });
    return map;
  };

  const summarizeTopItems = (invoices) => {
    const map = {};
    invoices.forEach(inv => {
      (inv.items || []).forEach(it => {
        map[it.name] = (map[it.name] || 0) + Number(it.quantity || 0);
      });
    });
    return map;
  };

  const summarizeRevenueByMonth = (invoices) => {
    const map = {};
    invoices.forEach(inv => {
      const date = new Date(inv.date);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!map[key]) map[key] = 0;
      (inv.items || []).forEach(it => {
        map[key] += Number(it.total) || (Number(it.quantity) || 0) * (Number(it.price) || 0);
      });
    });
    return map;
  };

  window.InventoryUtils = {
    calculateInventoryValue,
    countLowStock,
    summarizeSalesByMonth,
    summarizeTopItems,
    summarizeRevenueByMonth
  };
})();

