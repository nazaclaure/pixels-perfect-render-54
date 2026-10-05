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
