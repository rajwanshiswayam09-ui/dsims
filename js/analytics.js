(async () => {
  const activeUser = await StorageAPI.getCurrentUser();
  if (!activeUser) {
    window.location.href = 'auth.html';
    return;
  }

  const usageChartCanvas = document.getElementById('usageChart');
  const topItemsChartCanvas = document.getElementById('topItemsChart');
  const valueTrendChartCanvas = document.getElementById('valueTrendChart');
  const pieChartCanvas = document.getElementById('pieChart');
  const shopHealthChartCanvas = document.getElementById('shopHealthChart');
  const exportExcelBtn = document.getElementById('exportExcel');
  const exportPdfBtn = document.getElementById('exportPdf');

  let charts = {};
  let lastUsage = { labels: [], data: [] };
  let lastTop = { labels: [], data: [] };
  let lastTrend = { labels: [], data: [] };
  let lastPie = { labels: [], data: [] };
  let lastShopHealth = { labels: [], data: [] };

  const colors = {
    primary: '#38bdf8',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    indigo: '#6366f1',
    slate: '#64748b',
    white: '#f8fafc',
    muted: '#94a3b8'
  };

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: colors.muted }
      },
      x: {
        grid: { display: false },
        ticks: { color: colors.muted }
      }
    }
  };

  const drawCharts = async () => {
    const user = await StorageAPI.getCurrentUser();
    if (user) updateTopbarProfile(user);

    const invoices = await StorageAPI.getInvoices();
    const products = await StorageAPI.getProducts();

    // 1. Monthly Stock Usage (Bar)
    const usageMap = InventoryUtils.summarizeSalesByMonth(invoices);
    lastUsage.labels = Object.keys(usageMap).sort();
    lastUsage.data = lastUsage.labels.map(k => usageMap[k]);
    renderChart('usage', usageChartCanvas, 'bar', lastUsage.labels, lastUsage.data, colors.primary, 'Units Sold');

    // 2. Top Sold Items (Bar)
    const topMap = InventoryUtils.summarizeTopItems(invoices);
    lastTop.labels = Object.keys(topMap).sort((a, b) => topMap[b] - topMap[a]).slice(0, 5);
    lastTop.data = lastTop.labels.map(k => topMap[k]);
    renderChart('top', topItemsChartCanvas, 'bar', lastTop.labels, lastTop.data, colors.success, 'Units');

    // 3. Sales Distribution (Pie)
    lastPie.labels = lastTop.labels;
    lastPie.data = lastTop.data;
    renderChart('pie', pieChartCanvas, 'pie', lastPie.labels, lastPie.data, [colors.primary, colors.success, colors.warning, colors.indigo, colors.slate]);

    // 4. Monthly Revenue (Bar)
    const revenueMap = InventoryUtils.summarizeRevenueByMonth(invoices);
    lastShopHealth.labels = Object.keys(revenueMap).sort().slice(-6);
    lastShopHealth.data = lastShopHealth.labels.map(k => revenueMap[k]);
    renderChart('revenue', shopHealthChartCanvas, 'bar', lastShopHealth.labels, lastShopHealth.data, colors.indigo, 'Revenue');

    // 5. Inventory Value Trend (Line)
    lastTrend.labels = products.map(p => p.name).slice(0, 10);
    lastTrend.data = products.slice(0, 10).map(p => Number(p.price) * Number(p.quantity));
    renderChart('trend', valueTrendChartCanvas, 'line', lastTrend.labels, lastTrend.data, colors.primary, 'Stock Value', true);
  };

  const renderChart = (id, canvas, type, labels, data, color, label, fill = false) => {
    if (charts[id]) charts[id].destroy();

    const isPie = type === 'pie';
    const config = {
      type: type,
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: data,
          backgroundColor: isPie ? color : (Array.isArray(color) ? color[0] : color),
          borderColor: isPie ? 'transparent' : color,
          borderWidth: 2,
          tension: 0.4,
          fill: fill,
          pointRadius: 4,
          pointBackgroundColor: color
        }]
      },
      options: {
        ...chartDefaults,
        plugins: {
          legend: {
            display: isPie,
            position: 'bottom',
            labels: { color: colors.muted, padding: 20 }
          }
        }
      }
    };

    if (isPie) {
      delete config.options.scales;
    }

    charts[id] = new Chart(canvas.getContext('2d'), config);
  };

  const escapeCsv = (val) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportExcel = async () => {
    const shop = await StorageAPI.getShopDetails();
    const date = new Date().toISOString().slice(0, 10);
    const lines = [
      'DSIMS Analytics Export',
      `Exported,${date}`,
      `Shop,${escapeCsv(shop?.shopName || 'Not set')}`,
      `Owner,${escapeCsv(shop?.ownerName || 'Not set')}`,
      '',
      'Monthly Stock Usage',
      'Month,Units',
      ...lastUsage.labels.map((l, i) => `${escapeCsv(l)},${lastUsage.data[i] ?? 0}`),
      '',
      'Top Sold Items',
      'Item,Units',
      ...lastTop.labels.map((l, i) => `${escapeCsv(l)},${lastTop.data[i] ?? 0}`),
      '',
      'Monthly Revenue (Shop Health)',
      'Month,Revenue',
      ...lastShopHealth.labels.map((l, i) => `${escapeCsv(l)},${lastShopHealth.data[i] ?? 0}`),
      '',
      'Inventory Value Trend',
      'Product,Value',
      ...lastTrend.labels.map((l, i) => `${escapeCsv(l)},${lastTrend.data[i] ?? 0}`)
    ];
    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `DSIMS_Analytics_${date}.csv`);
  };

  const exportPdf = async () => {
    const jspdfLib = window.jspdf;
    if (!jspdfLib) {
      showToast('PDF library not loaded', 'error');
      return;
    }
    const { jsPDF } = jspdfLib;
    const doc = new jsPDF('p', 'mm', 'a4');
    const shop = await StorageAPI.getShopDetails();
    const date = new Date().toLocaleString();

    doc.setFontSize(18);
    doc.text('DSIMS – Analytics Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Exported: ${date}`, 14, 28);
    doc.text(`Shop: ${shop?.shopName || 'Not set'} | Owner: ${shop?.ownerName || 'Not set'}`, 14, 34);

    const chartList = [
      { canvas: usageChartCanvas, title: 'Monthly Stock Usage' },
      { canvas: topItemsChartCanvas, title: 'Top Sold Items' },
      { canvas: pieChartCanvas, title: 'Sales Distribution' },
      { canvas: shopHealthChartCanvas, title: 'Monthly Revenue' },
      { canvas: valueTrendChartCanvas, title: 'Inventory Value Trend' }
    ];

    let yPos = 44;
    const imgW = 180;
    const imgH = 80;

    chartList.forEach(({ canvas, title }) => {
      try {
        const imgData = canvas.toDataURL('image/png', 1.0);
        if (yPos + imgH > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.text(title, 14, yPos - 2);
        doc.addImage(imgData, 'PNG', 14, yPos, imgW, imgH);
        yPos += imgH + 20;
      } catch (e) {
        console.error('PDF image error', e);
      }
    });

    doc.save(`DSIMS_Analytics_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  await drawCharts();

  if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportExcel);
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportPdf);
})();