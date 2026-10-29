(() => {
  'use strict';

  const locations = {
    'Rizal': [
      'Antipolo', 'Cainta', 'Taytay', 'Angono', 'Binangonan', 'Rodriguez',
      'San Mateo', 'Cardona', 'Teresa', 'Morong', 'Pililla', 'Tanay', 'Baras', 'Jala-Jala'
    ],
    'Metro Manila': [
      'Quezon City', 'Manila', 'Makati', 'Pasig', 'Taguig', 'Mandaluyong',
      'Marikina', 'San Juan', 'Parañaque', 'Muntinlupa', 'Las Piñas', 'Pasay',
      'Caloocan', 'Valenzuela', 'Malabon', 'Navotas'
    ],
    'Cavite': [
      'Bacoor', 'Imus', 'Dasmariñas', 'General Trias', 'Silang', 'Tagaytay', 'Trece Martires'
    ],
    'Laguna': ['San Pedro', 'Biñan', 'Santa Rosa', 'Calamba', 'Cabuyao'],
    'Bulacan': ['Malolos', 'Meycauayan', 'Marilao', 'Baliwag', 'Bocaue']
  };

  const provinceProfiles = {
    'Rizal': { priceIndex: 0.91, trend: 6.1 },
    'Metro Manila': { priceIndex: 1.2, trend: 7.3 },
    'Cavite': { priceIndex: 0.94, trend: 6.4 },
    'Laguna': { priceIndex: 0.98, trend: 6.7 },
    'Bulacan': { priceIndex: 0.88, trend: 5.9 }
  };

  const marketTiers = {
    central: {
      name: 'central business',
      priceIndex: 1.2,
      trendAdjustment: 1.7,
      density: 1.2,
      commercial: 1.2,
      schools: 1.08,
      hospitals: 1.12,
      transport: 1.18,
      business: 1.22
    },
    urban: {
      name: 'urban growth',
      priceIndex: 1.08,
      trendAdjustment: 1.1,
      density: 1.12,
      commercial: 1.08,
      schools: 1.05,
      hospitals: 1.05,
      transport: 1.08,
      business: 1.08
    },
    established: {
      name: 'established local',
      priceIndex: 1,
      trendAdjustment: 0.5,
      density: 0.98,
      commercial: 0.96,
      schools: 1,
      hospitals: 0.98,
      transport: 0.95,
      business: 0.94
    },
    emerging: {
      name: 'emerging local',
      priceIndex: 0.92,
      trendAdjustment: 0,
      density: 0.88,
      commercial: 0.86,
      schools: 0.92,
      hospitals: 0.9,
      transport: 0.85,
      business: 0.84
    }
  };

  const cityTiers = {
    central: new Set(['Quezon City', 'Manila', 'Makati', 'Pasig', 'Taguig', 'Mandaluyong', 'Pasay']),
    urban: new Set([
      'Antipolo', 'Cainta', 'Taytay', 'Bacoor', 'Imus', 'Dasmariñas', 'General Trias',
      'Meycauayan', 'Marilao', 'Santa Rosa', 'Biñan', 'Calamba', 'Muntinlupa', 'Parañaque',
      'Marikina', 'San Juan', 'Caloocan', 'Valenzuela', 'Las Piñas', 'Malabon', 'Navotas', 'Cabuyao'
    ]),
    established: new Set([
      'Angono', 'Binangonan', 'Rodriguez', 'San Mateo', 'Malolos', 'Silang',
      'Tagaytay', 'San Pedro', 'Cabuyao', 'Baliwag', 'Trece Martires'
    ])
  };

  const form = document.getElementById('valuationForm');
  const provinceSelect = document.getElementById('province');
  const cityInput = document.getElementById('city');
  const cityOptions = document.getElementById('cityOptions');
  const barangayInput = document.getElementById('barangay');
  const locationError = document.getElementById('locationError');
  const chartCanvas = document.getElementById('valuationChart');

  if (!form || !provinceSelect || !cityInput || !cityOptions || !barangayInput || !locationError || !chartCanvas) {
    throw new Error('The valuation page is missing required location or chart elements.');
  }
  if (typeof Chart === 'undefined') {
    throw new Error('The valuation chart library failed to load.');
  }

  const normalize = (value) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();

  const cityLookup = new Map(
    Object.entries(locations).flatMap(([province, cities]) =>
      cities.map(city => [`${normalize(province)}|${normalize(city)}`, city])
    )
  );

  Object.keys(locations).forEach((province) => {
    const option = document.createElement('option');
    option.value = province;
    option.textContent = province;
    provinceSelect.append(option);
  });

  const chartColors = getComputedStyle(document.documentElement);
  const chartCloud = chartColors.getPropertyValue('--cloud').trim();
  const chartSky = chartColors.getPropertyValue('--sky-glow').trim();
  const chartSkyRgb = chartColors.getPropertyValue('--sky-glow-rgb').trim();
  const valuationChart = new Chart(chartCanvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
      datasets: [{
        label: 'Indicative Market Trend',
        data: [],
        borderColor: chartSky,
        backgroundColor: `rgb(${chartSkyRgb} / 18%)`,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: chartSky,
        pointBorderColor: chartCloud,
        pointBorderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: `rgb(${chartSkyRgb} / 18%)` },
          ticks: { color: chartCloud, callback: value => '₱' + value + 'M' }
        },
        x: { grid: { display: false }, ticks: { color: chartCloud } }
      }
    }
  });

  const getCity = () => cityLookup.get(`${normalize(provinceSelect.value)}|${normalize(cityInput.value)}`);

  const getTier = (city) => {
    if (cityTiers.central.has(city)) return marketTiers.central;
    if (cityTiers.urban.has(city)) return marketTiers.urban;
    if (cityTiers.established.has(city)) return marketTiers.established;
    return marketTiers.emerging;
  };

  const getBarangayAdjustment = (barangay) => {
    const normalized = normalize(barangay);
    if (/\b(central|poblacion|commercial|business district|town proper)\b/.test(normalized)) return 1.04;
    if (/\b(subdivision|village|residential|heights|estate)\b/.test(normalized)) return 1.015;
    return 1;
  };

  const setLocationError = (show) => {
    locationError.hidden = !show;
    provinceSelect.setAttribute('aria-invalid', String(show && !provinceSelect.value));
    cityInput.setAttribute('aria-invalid', String(show && (!getCity() || !cityInput.value.trim())));
  };

  const clearEstimate = () => {
    document.querySelector('.result-price').textContent = 'Select a location to view your estimate';
    document.getElementById('confidenceLabel').textContent = 'Location required';
    document.getElementById('confidenceValue').textContent = '—';
    document.getElementById('marketTrend').textContent = '—';
    document.querySelector('.insight-box p').textContent = 'Select a province and city to see a location-adjusted estimate.';
    valuationChart.data.datasets[0].data = [];
    valuationChart.update();
  };

  const formatPeso = (value) => new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(value);

  const getConfidence = (score) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.55) return 'Medium';
    return 'Low';
  };

  const updateValuation = () => {
    const city = getCity();
    const province = provinceSelect.value;
    if (!city || !provinceProfiles[province]) {
      clearEstimate();
      return;
    }

    const tier = getTier(city);
    const provinceProfile = provinceProfiles[province];
    const propertyType = document.getElementById('propertyType').value;
    const bedrooms = Number(document.getElementById('bedrooms').value || 3);
    const floorArea = Number(document.getElementById('floorArea').value || 120);
    const lotArea = Number(document.getElementById('lotArea').value || 200);
    const rateMap = { House: 11500, Condo: 13000, Apartment: 9800, Lot: 1800 };
    const rate = rateMap[propertyType] || 11000;
    const baseValue = (floorArea * rate) + (lotArea * rate * 0.38) + (bedrooms * 400000);

    const accessibilityScore =
      (tier.density * 0.15) +
      (tier.commercial * 0.2) +
      (tier.schools * 0.1) +
      (tier.hospitals * 0.15) +
      (tier.transport * 0.2) +
      (tier.business * 0.2);
    const accessibilityAdjustment = Math.min(1.08, Math.max(0.88, 0.84 + accessibilityScore * 0.16));
    const barangayAdjustment = getBarangayAdjustment(barangayInput.value);
    const condition = document.getElementById('condition').value;
    const conditionMultiplier = condition === 'Premium Finish' ? 1.12 :
      condition === 'Move-in Ready' ? 1.04 :
      condition === 'Well Maintained' ? 1.08 : 0.94;

    const estimated = baseValue *
      provinceProfile.priceIndex *
      tier.priceIndex *
      accessibilityAdjustment *
      barangayAdjustment *
      conditionMultiplier;
    const lower = estimated * 0.94;
    const upper = estimated * 1.06;
    const score = Math.min(0.92, 0.62 + (bedrooms / 10) * 0.18 + (floorArea / 250) * 0.08);
    const confidence = getConfidence(score);
    const marketTrend = provinceProfile.trend + tier.trendAdjustment;
    const barangayLabel = barangayInput.value.trim();

    document.querySelector('.result-price').innerHTML = `${formatPeso(lower)} <span>– ${formatPeso(upper)}</span>`;
    document.getElementById('confidenceLabel').textContent = `${confidence} confidence`;
    document.getElementById('confidenceValue').textContent = confidence;
    document.getElementById('marketTrend').textContent = `+${marketTrend.toFixed(1)}% indicative`;
    document.querySelector('.insight-box p').textContent =
      `${bedrooms}-bedroom ${propertyType.toLowerCase()} estimate for ${barangayLabel ? `${barangayLabel}, ` : ''}${city}, ${province}. Adjusted for modeled density, commercial activity, schools, hospitals, transport, business access, and regional market trend.`;

    const trendValues = [
      (lower / 1000000) * 0.9,
      (lower / 1000000) * 0.96,
      (lower / 1000000) * 1.01,
      (lower / 1000000) * 1.04,
      (lower / 1000000) * 1.08,
      (upper / 1000000)
    ];
    valuationChart.data.datasets[0].data = trendValues.map(value => Number(value.toFixed(2)));
    valuationChart.update();
  };

  provinceSelect.addEventListener('change', () => {
    cityInput.value = '';
    cityInput.disabled = !provinceSelect.value;
    cityInput.placeholder = provinceSelect.value ? 'Type to search cities / municipalities' : 'Select a province first';
    barangayInput.value = '';
    barangayInput.disabled = true;
    cityOptions.replaceChildren();

    (locations[provinceSelect.value] || []).forEach((city) => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      cityOptions.append(option);
    });

    setLocationError(false);
    updateValuation();
  });

  const updateCitySelection = () => {
    const validCity = Boolean(getCity());
    barangayInput.disabled = !validCity;
    cityInput.setAttribute('aria-invalid', String(Boolean(cityInput.value.trim()) && !validCity));
    if (validCity) setLocationError(false);
    updateValuation();
  };

  cityInput.addEventListener('input', updateCitySelection);
  cityInput.addEventListener('change', updateCitySelection);
  barangayInput.addEventListener('input', updateValuation);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!getCity() || !provinceProfiles[provinceSelect.value]) {
      setLocationError(true);
      (provinceSelect.value ? cityInput : provinceSelect).focus();
      return;
    }
    setLocationError(false);
    updateValuation();
  });

  document.querySelectorAll('#propertyType, #bedrooms, #floorArea, #lotArea, #condition').forEach((field) => {
    field.addEventListener('input', updateValuation);
    field.addEventListener('change', updateValuation);
  });

  clearEstimate();
})();
