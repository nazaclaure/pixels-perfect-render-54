<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- User roles live in `public.user_roles` (enum app_role), never on profiles — prevents privilege escalation.
- Client auth state comes from `AuthProvider` in src/lib/auth.tsx; protected pages live under src/routes/_authenticated/ — single source of session truth.
- Demo accounts are created on demand by a server function using the admin client — lets testers enter without signing up.
- Found-item photos live in a private storage bucket and are shown via short-lived signed URLs — public buckets are blocked by workspace policy.
- `found_items` uses column-level grants so description is never readable by the public; verification data lives in `found_item_secrets`, and claimants read only the questions via a security-definer RPC.
- Claim inserts move the item to "en revisión" through a database trigger, not client code — keeps status changes trustworthy.
- Encargado panel data (private item info, claimant contact, CI, deliveries) is read and written only through security-definer `admin_*` RPCs that call `assert_encargado()` — role check enforced server-side, not just by hiding the UI.
