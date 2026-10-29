# Live property valuation setup

The Admin Dashboard and both public valuation pages call the authenticated `property-valuation` Edge Function. They share the same Philippine province/city list, location formatting, property inputs, and request shape so equivalent property details use the same comparable-sales lookup and calculation. OpenAI produces the written analysis; the PHP range is calculated from verified closed-sale records, so the model cannot invent the underlying estimate. Only anonymized comparable-sale aggregates are sent to OpenAI, not the exact property location or individual sale records.

## Deploy

1. Install and sign in to the Supabase CLI, then run these commands from `YoloV03`:

   ```powershell
   supabase link --project-ref uranjhaewlkyzpveedvj
   supabase db push
   supabase functions deploy property-valuation --project-ref uranjhaewlkyzpveedvj
   ```

2. In the Supabase project dashboard, add `OPENAI_API_KEY` under **Project Settings → Edge Functions → Secrets**. Do not put this key in HTML, JavaScript, or browser storage. The function uses Supabase's server-provided URL, anon key, and service-role key.
3. Host the portal over HTTPS and sign in through the SIERRA HAVEN Supabase account. Opening the dashboard directly as a `file://` page is not a supported live deployment.

## Add valuation evidence

The migration creates `public.valuation_comparables`. It is empty by design; no sample or fabricated sales are inserted. Add verified, closed sales through the Supabase dashboard or a trusted administrative import. Set `verified` to `true` only after checking the source. Store each location using the same full location text users will enter (for example, barangay/neighborhood and city), the property type, floor area, sale price in PHP, sale date, and source.

An estimate requires at least three verified sales from the last three years, at the exact case-insensitive location and property type, with floor area within 40% of the subject. Bedroom counts must be within two when recorded. The displayed central estimate is the median comparable price per square metre scaled to the subject's floor area; the low/high range is the 25th–75th percentile. Both are indicative, not a formal appraisal.

The Admin Dashboard's evidence-confidence percentage is a coverage score calculated from comparable count, price spread, and recency. It is not a statistical probability or guarantee of valuation accuracy. Year-over-year market direction is displayed only when at least three size- and bedroom-matched sales exist in each of the most recent two 12-month periods; otherwise the dashboard says there is not enough recent sales evidence. Each signed-in account is limited to five AI requests per minute.

If records are absent or insufficient, the function returns an explanatory message instead of manufacturing a valuation.

## Troubleshooting

If the page says **“Failed to send a request to the Edge Function”**, the function endpoint is not reachable. Check that `property-valuation` is deployed to project `uranjhaewlkyzpveedvj`, that the page is served over HTTPS, and that the browser can access the Supabase project. Confirm deployment with:

```powershell
supabase functions list --project-ref uranjhaewlkyzpveedvj
```

The function must appear in the list. A missing deployment is different from an insufficient-sales message: only after the endpoint is reachable can it report whether comparable records match.
