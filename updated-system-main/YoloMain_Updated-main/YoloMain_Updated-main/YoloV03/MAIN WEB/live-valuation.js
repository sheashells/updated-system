(() => {
  'use strict';

  const locations = window.havenPhilippineLocations;
  const form = document.getElementById('valuationForm');
  const provinceSelect = document.getElementById('province');
  const cityInput = document.getElementById('city');
  const cityOptions = document.getElementById('cityOptions');
  const barangayInput = document.getElementById('barangay');
  const status = document.getElementById('locationError');
  const cityLookup = new Map(
    Object.entries(locations).flatMap(([province, cities]) =>
      cities.map(city => [`${province.toLocaleLowerCase()}|${city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()}`, city])
    )
  );

  if (!locations || !form || !provinceSelect || !cityInput || !cityOptions || !barangayInput || !status) {
    throw new Error('The valuation page is missing required form or result elements.');
  }

  Object.keys(locations).forEach(province => {
    const option = document.createElement('option');
    option.value = province;
    option.textContent = province;
    provinceSelect.append(option);
  });

  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();
  const getCity = () => cityLookup.get(`${provinceSelect.value.toLocaleLowerCase()}|${normalize(cityInput.value)}`);
  const setStatus = message => {
    status.textContent = message;
    status.hidden = !message;
  };

  const clearResults = () => {
    document.getElementById('estimatedValue').textContent = 'Submit property details to request a live estimate';
    document.getElementById('estimateRange').textContent = 'Comparable sales range: awaiting evidence';
    document.getElementById('confidenceLabel').textContent = 'Awaiting evidence';
    document.getElementById('confidenceValue').textContent = '—';
    document.getElementById('marketTrend').textContent = '—';
    document.getElementById('valuationInsight').textContent =
      'No estimate yet. The system will not generate a price without verified local sale evidence.';
  };

  const formatPeso = value => new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(value);
  document.getElementById('valuationInsight').style.whiteSpace = 'pre-line';

  provinceSelect.addEventListener('change', () => {
    cityInput.value = '';
    cityInput.disabled = !provinceSelect.value;
    cityInput.placeholder = provinceSelect.value ? 'Type to search cities / municipalities' : 'Select a province first';
    barangayInput.value = '';
    barangayInput.disabled = true;
    cityOptions.replaceChildren();
    (locations[provinceSelect.value] || []).forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      cityOptions.append(option);
    });
    clearResults();
    setStatus('');
  });

  const updateCitySelection = () => {
    const validCity = Boolean(getCity());
    barangayInput.disabled = !validCity;
    cityInput.setAttribute('aria-invalid', String(Boolean(cityInput.value.trim()) && !validCity));
    if (!validCity) clearResults();
    setStatus('');
  };
  cityInput.addEventListener('input', updateCitySelection);
  cityInput.addEventListener('change', updateCitySelection);

  form.querySelectorAll('input, select').forEach(field => {
    field.addEventListener('input', () => {
      clearResults();
      if (field !== cityInput) setStatus('');
    });
    field.addEventListener('change', clearResults);
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus('Enter valid property details before requesting an estimate.');
      return;
    }
    const city = getCity();
    if (!city) {
      setStatus('Select a city from the suggestions for the selected province.');
      (provinceSelect.value ? cityInput : provinceSelect).focus();
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setStatus('Checking verified comparable sales and requesting AI analysis…');
    try {
      if (!window.sierraSupabase || !window.sierraReady) {
        throw new Error('Supabase is not configured. Open the hosted portal and try again.');
      }
      await window.sierraReady;
      const { data: sessionData, error: sessionError } = await window.sierraSupabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        throw new Error('Sign in to SIERRA HAVEN before requesting a live valuation.');
      }

      const locationParts = [barangayInput.value.trim(), city, provinceSelect.value].filter(Boolean);
      const { data, error } = await window.sierraSupabase.functions.invoke('property-valuation', {
        body: {
          location: locationParts.join(', '),
          propertyType: document.getElementById('propertyType').value,
          floorAreaM2: Number(document.getElementById('floorArea').value),
          lotAreaM2: Number(document.getElementById('lotArea').value),
          ageYears: Number(document.getElementById('ageYears').value),
          bedrooms: Number(document.getElementById('bedrooms').value),
          propertyCondition: document.getElementById('condition').value
        }
      });
      if (error) {
        let message = error.message || 'The live valuation request failed.';
        if (error.context instanceof Response) {
          const details = await error.context.json().catch(() => null);
          if (details && typeof details.error === 'string') message = details.error;
        }
        if (message.toLowerCase().includes('failed to send a request to the edge function')) {
          message = 'Supabase could not reach the property-valuation Edge Function. It is not deployed to this Supabase project yet, or the project endpoint is unavailable. Deploy it with `supabase functions deploy property-valuation --project-ref uranjhaewlkyzpveedvj`, then try again.';
        }
        throw new Error(message);
      }
      if (
        !data ||
        !data.estimate ||
        !Number.isFinite(data.estimate.low) ||
        !Number.isFinite(data.estimate.central) ||
        !Number.isFinite(data.estimate.high) ||
        !Number.isInteger(data.comparableCount) ||
        !Number.isInteger(data.evidence?.confidenceScore) ||
        !data.marketTrend ||
        typeof data.marketTrend.label !== 'string' ||
        !data.analysis ||
        typeof data.analysis.summary !== 'string'
      ) {
        throw new Error('The valuation service returned an invalid response.');
      }

      document.getElementById('estimatedValue').textContent = formatPeso(data.estimate.central);
      document.getElementById('estimateRange').textContent =
        `Comparable sales range: ${formatPeso(data.estimate.low)} – ${formatPeso(data.estimate.high)}`;
      document.getElementById('confidenceLabel').textContent = `${data.evidence.confidenceScore}% confidence`;
      document.getElementById('confidenceValue').textContent = `${data.evidence.confidenceScore}%`;
      const trendIcon = data.marketTrend.direction === 'rising' ? '📈 ' :
        data.marketTrend.direction === 'falling' ? '📉 ' :
          data.marketTrend.direction === 'stable' ? '↔ ' : '';
      document.getElementById('marketTrend').textContent = `${trendIcon}${data.marketTrend.label}`;
      document.getElementById('valuationInsight').textContent = [
        `${data.comparableCount} verified comparable closed sales · ${data.evidence.oldestSaleDate} to ${data.evidence.newestSaleDate}.`,
        `AI market analysis: ${data.analysis.summary}`,
        `Owner actions: ${data.analysis.ownerRecommendations.join(' ')}`,
        `Investor considerations: ${data.analysis.investorRecommendations.join(' ')}`,
        `Risks and limitations: ${data.analysis.risks.join(' ')}`
      ].join('\n');
      setStatus('');
    } catch (error) {
      setStatus(error.message || 'The live valuation could not be completed.');
    } finally {
      submitButton.disabled = false;
    }
  });

  provinceSelect.value = 'Rizal';
  provinceSelect.dispatchEvent(new Event('change'));
  cityInput.value = 'Antipolo';
  updateCitySelection();
  clearResults();
})();
