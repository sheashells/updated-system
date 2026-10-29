# Live tenant maintenance requests

Tenant maintenance requests are stored in the shared Supabase `maintenance_requests` table. Tenants can submit and view only their own requests. An administrator can view, update, assign, and remove requests. Row-level security enforces these rules; browser code never uses a service-role key.

## Deploy the database

From the `YoloV03` directory, link the project if needed and apply the migration:

```powershell
supabase link --project-ref uranjhaewlkyzpveedvj
supabase db push
```

The migration file is `supabase/migrations/20261029000000_maintenance_requests.sql`.

## Grant admin access

The dashboard only receives all maintenance requests when the signed-in Supabase user has the trusted `app_metadata` claim `{"role":"admin"}`. In Supabase Dashboard, open **Authentication → Users**, select the admin account, and set its **app metadata** to:

```json
{
  "role": "admin"
}
```

Do not put the role in user-editable `user_metadata`. Sign out and back in after changing the app metadata so the JWT refreshes. Tenant accounts must not have the admin claim.

## Use the live workflow

1. Host the site over HTTPS and sign in as a tenant.
2. Submit a maintenance request with the property, unit/area, concern, and notes.
3. Sign in to the Admin Dashboard with the admin account and open **Maintenance**. New tenant requests load when the page opens, refresh every 30 seconds while that view is open, or immediately with **Refresh**.
4. Admin status, assignment, priority, notes, and cost changes are saved to Supabase and are visible to the tenant when they reload their dashboard.

If a request cannot be sent or loaded, the page displays the backend error. Check that the migration was applied, the user is signed in, the site is hosted over HTTPS, and the admin account has the app metadata claim. Requests are not silently treated as delivered when the live database is unavailable.
