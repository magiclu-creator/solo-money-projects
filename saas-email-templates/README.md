# SaaS Email Template Collection

> 10 production-ready email templates for SaaS products. Dark theme, responsive, email-client compatible.

## Templates Included

| Template | Use Case |
|----------|----------|
| `welcome.html` | New user onboarding |
| `weekly-report.html` | Automated usage/stats report |
| `upgrade-prompt.html` | Free-to-paid conversion |
| `password-reset.html` | Password reset flow |
| `invoice.html` | Payment receipt/invoice |
| `trial-ending.html` | Trial expiration reminder |
| `feature-announcement.html` | New feature notification |
| `referral-invite.html` | Referral program invite |
| `feedback-request.html` | NPS/feedback collection |
| `account-deactivated.html` | Account status change |

## Template Variables

All templates use Handlebars-style variables: `{{variable_name}}`

Common variables:
- `{{name}}` — User's name
- `{{dashboard_url}}` — Link to dashboard
- `{{unsubscribe_url}}` — Unsubscribe link

## How to Use

### 1. With any email service
Replace `{{variables}}` with your dynamic values.

### 2. With Resend (recommended)
```javascript
import { Resend } from 'resend';
const resend = new Resend('re_xxx');

await resend.emails.send({
  from: 'you@example.com',
  to: 'user@example.com',
  subject: 'Welcome to LinkForge!',
  html: welcomeTemplate.replace('{{name}}', userName),
});
```

### 3. With SendGrid / Mailchimp / etc.
Upload HTML templates and map variables to merge tags.

## Customization

All colors are inline CSS (email-compatible). To change the brand color:
1. Search for `#6366f1` (primary)
2. Replace with your brand color
3. Also update `#818cf8` (light variant) and `#a78bfa` (accent)

## Pricing

- **Single template**: $9
- **Full collection (10 templates)**: $29
- **Customized for your brand**: $99

## License

MIT — Use in unlimited projects.
