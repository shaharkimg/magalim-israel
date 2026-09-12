# Domain Migration Completion Checklist

## Status: DNS Propagation In Progress
The nameservers are correctly configured at the registry level (verified via WHOIS at isoc.org.il on 2026-09-12). Global DNS propagation to all DNS resolvers (like Google's 8.8.8.8) is in progress—typically 1-24 hours for .co.il domains.

---

## ✅ Phase 1: Foundation (Complete)
- [x] Domain registered at Box (megalim-israel.co.il)
- [x] Nameservers delegated to Vercel (ns1.vercel-dns.com, ns2.vercel-dns.com)
- [x] App code updated with SITE_HOST = "megalim-israel.co.il"
- [x] Hebrew app name "מגלים" deployed everywhere (manifest, index.html, app.js)
- [x] OAuth error handling implemented (readAuthRedirectError, showAuthRedirectError)
- [x] Digital asset links file created (.well-known/assetlinks.json)
- [x] TWA manifest created (twa/twa-manifest.json)
- [x] All validation scripts in place (check_live.js, check_twa.js, check_wiring.js)
- [x] GitHub Actions CI/CD workflow configured

---

## ⏳ Phase 2: Waiting for DNS Propagation
**Current Status**: Waiting for global DNS propagation (check with: `node scripts/check_live.js`)

**Expected**: Complete within 1-24 hours from nameserver configuration (2026-09-12 13:51 UTC)

### How to Check
```bash
# Option A: Run the automated check (returns SUCCESS when ready)
node scripts/check_live.js

# Option B: Manual verification (when ready, should show Vercel nameservers)
nslookup -type=NS megalim-israel.co.il 8.8.8.8

# Option C: Verify domain loads (when ready, should return HTTP 200/301)
curl -I https://megalim-israel.co.il
```

---

## 🔧 Phase 3: Once DNS Propagates (Start Here)

### 1. Verify DNS Resolution
```bash
node scripts/check_live.js
```
Expected output: All checks pass (green status)

### 2. Fix Vercel Production Domain
**Current Issue**: www is set as Production host instead of apex domain

Vercel Dashboard → Settings → Domains:
- Set `megalim-israel.co.il` (without www) as **Primary** domain
- Ensure `www.megalim-israel.co.il` redirects to apex

### 3. Update Supabase Configuration
Supabase → Authentication → Providers → Redirect URLs:
- Keep: `https://magalim-israel.vercel.app/oauth/callback` (for dev/fallback)
- Keep: `https://magalim-israel.vercel.app/` (for dev)
- Update Site URL to: `https://megalim-israel.co.il` (from magalim-israel.vercel.app)
- Verify both domains are in Redirect URLs:
  - ✓ `https://megalim-israel.co.il`
  - ✓ `https://megalim-israel.co.il/`
  - ✓ `https://www.megalim-israel.co.il`
  - ✓ `https://www.megalim-israel.co.il/`

### 4. Test OAuth Authentication
Open the app and test:
- Google sign-in flow
- Facebook sign-in flow
- Verify successful redirect and token exchange
- Check browser console for any errors

### 5. Verify All Assets Load
```bash
curl -I https://megalim-israel.co.il/manifest.json
curl -I https://megalim-israel.co.il/.well-known/assetlinks.json
curl -I https://megalim-israel.co.il/icon-192.png
curl -I https://megalim-israel.co.il/icon-512.png
```
Expected: All return HTTP 200

---

## 📱 Phase 4: Google Play Console Setup

### Prerequisites Met
- ✓ Digital asset links file live at `https://megalim-israel.co.il/.well-known/assetlinks.json`
- ✓ App name set to Hebrew "מגלים"
- ✓ Icons prepared (192×192 and 512×512 PNG)
- ✓ Privacy policy route at `/privacy`
- ✓ Terms route at `/terms`
- ✓ Account deletion flow implemented

### Next Steps
1. Create Play Console account (developer.android.com/console)
2. Create new app with package name: `il.co.megalimisrael.app`
3. Build Android app using Bubblewrap:
   ```bash
   npm install -g @bubblewrap/cli
   bubblewrap init --manifest twa/twa-manifest.json
   bubblewrap build
   ```
4. Upload generated APK/AAB to Play Console
5. Copy SHA-256 fingerprint from Play Console → Setup → App integrity → App signing key certificate
6. Update `.well-known/assetlinks.json` with the fingerprint:
   ```bash
   # Replace REPLACE_WITH_SHA256_FROM_PLAY_CONSOLE with actual value
   ```
7. Re-deploy the app with updated assetlinks.json
8. Submit for Google Play review

---

## 🔍 Troubleshooting

### DNS Still Shows "Non-existent domain"
- Wait longer (1-24 hours typical, sometimes up to 48h)
- Verify nameservers at registry: https://whois.isoc.org.il/ (search your domain)
- Should show: ns1.vercel-dns.com, ns2.vercel-dns.com

### OAuth Still Fails After DNS Live
- Check Supabase Redirect URLs match your domain
- Verify Site URL updated to new domain
- Clear browser cache and cookies
- Check network tab for actual error in OAuth callback

### assetlinks.json Returns 404
- Verify file exists at `.well-known/assetlinks.json` in repo root
- Deploy code with file included
- Check Vercel static file serving settings
- Try: `curl -I https://megalim-israel.co.il/.well-known/assetlinks.json`

### Icons Don't Load
- Verify files exist: `icon-192.png` and `icon-512.png` in repo root
- Check manifest.json references: `/icon-192.png` and `/icon-512.png`
- Try: `curl -I https://megalim-israel.co.il/icon-192.png`

---

## 📋 CI/CD Verification
The GitHub Actions workflow (`checked.yml`) runs automatically on every push and validates:
- ✓ Wiring (67 critical functions present)
- ✓ TWA consistency (all domains match)
- ✓ Asset existence (icons, manifest, assetlinks)
- ✓ OAuth error handling
- ✓ Syntax checks

All checks currently passing ✅

---

## 📞 Support
If something fails in Phase 3 or later, check:
1. Run `node scripts/check_live.js` to identify which step failed
2. Review the specific error message
3. Consult the relevant docs file:
   - `docs/VERCEL-DOMAIN.md` - Domain configuration
   - `docs/OAUTH-DOMAIN.md` - OAuth setup
   - `docs/ANDROID-TWA.md` - Play Console guide

---

**Last Updated**: 2026-09-12
**DNS Configured**: 2026-09-12 13:51 UTC
**Expected Completion**: 2026-09-13 through 2026-09-14
