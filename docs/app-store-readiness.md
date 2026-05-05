# Semesterly App Store readiness

Last updated: 2026-05-05

## Current state

Semesterly is a strong web/PWA MVP. It is closer to a TestFlight prototype than an App Store submission.

Completed readiness pieces:

- Public legal/support URLs:
  - `/privacy`
  - `/terms`
  - `/support`
- PWA manifest and offline fallback.
- Persistent account sessions via secure HTTP-only cookies.
- Browser-password-manager-compatible sign-in/signup fields.
- Module preferences persisted server-side.
- Assignment metadata persisted explicitly with `assignmentType` and `remarks`.
- Profile data controls:
  - user data export
  - account deletion
- Privacy export excludes password hashes and session secrets.
- CI/build validation path:
  - `npm run typecheck`
  - `npm run build`
  - `npm run deploy:check`

## Required before App Store submission

### Apple/native package

- Apple Developer account access.
- Bundle ID.
- Capacitor iOS project or another native wrapper.
- App icons at required iOS sizes.
- Launch screen.
- TestFlight build.
- Device QA on at least one real iPhone.

### App Store Connect metadata

- App name/subtitle.
- Description.
- Keywords.
- Category.
- Age rating answers.
- Privacy Nutrition Label answers.
- Review notes.
- Demo/review account credentials.
- Screenshots for required device sizes.

### Product gaps

- Password reset flow backed by an email provider.
- Email verification for new accounts.
- Notifications/reminders implementation and permission copy.
- More robust calendar recurrence and semester date handling.
- Mobile QA pass for small iPhones and notched devices.
- Clear first-run sample/import/onboarding path.

### Security/privacy review

- Confirm production `SESSION_SECRET` is set and rotated outside source control.
- Confirm `DEMO_AUTH_ENABLED` is not enabled in production unless intentionally running demo mode.
- Confirm database migrations are applied in production.
- Confirm account deletion cascades user-owned records as expected.
- Confirm privacy export does not include secrets.
- Confirm support/privacy/terms URLs are stable and publicly reachable.

## Next recommended build order

1. Add password reset/email verification provider.
2. Add reminder settings and notification permissions copy.
3. Add Capacitor and generate iOS project.
4. Run mobile QA and fix iPhone layout issues.
5. Prepare screenshots, App Store metadata, and review account.
