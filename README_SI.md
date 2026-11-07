# DINUXX AI BOT — WhatsApp Webhook

මෙය Meta WhatsApp Cloud API සඳහා Vercel Webhook starter project එකකි.
මෙය incoming webhook events ලබාගෙන Vercel Function Logs වල පෙන්වයි.
**මෙය තවම AI auto-reply bot එකක් නොවේ** — AI reply සහ WhatsApp send-message logic පසුව එකතු කළ යුතුය.

## 1. GitHub වෙත Upload කිරීම

1. GitHub හි `dinuxx-ai-webhook` නමින් අලුත් repository එකක් සාදන්න.
2. ZIP එක extract කර ඇතුළත ඇති files සහ `api` folder එක repository root එකට upload කරන්න.
3. `api/webhook.js` file එක `api` folder එක ඇතුළේම තිබිය යුතුයි.

## 2. Vercel Deploy කිරීම

1. Vercel වෙත ගොස් **Add New → Project** තෝරන්න.
2. `dinuxx-ai-webhook` GitHub repository එක Import කරන්න.
3. Framework Preset: **Other** (හෝ Vercel auto-detect කරන සැකසුම) තබන්න.
4. Deploy කිරීමට පෙර හෝ පසුව Project → Settings → Environment Variables වෙත යන්න.
5. පහත variables දෙක add කරන්න:

   - `WHATSAPP_VERIFY_TOKEN` = ඔයාම හදාගන්න දිගු secret එකක්. උදා: `DINUX_X9_bot_verify_2026_random`
   - `META_APP_SECRET` = Meta App Dashboard → App settings → Basic හි ඇති **App Secret**

6. Save කරලා **Redeploy** කරන්න.

App Secret එක හෝ Verify Token එක කිසිවෙකුට share කරන්න එපා. GitHub code එකට ඒවා දාන්න එපා.

## 3. Meta Developers හි Webhook සැකසීම

Deploy වුණාම Vercel domain එක මෙහෙම ලැබේවි:

`https://YOUR-PROJECT.vercel.app`

Meta → WhatsApp → Configuration / Webhooks හි:

- **Callback URL:** `https://YOUR-PROJECT.vercel.app/api/webhook`
- **Verify Token:** Vercel හි `WHATSAPP_VERIFY_TOKEN` සඳහා දුන් අගයම

ඉන්පසු **Verify and Save** කරන්න.

## 4. Webhook fields Subscribe කිරීම

Webhook verify වුණාට පස්සේ `messages` field එක subscribe කරන්න.
අවශ්‍ය නම් `message_status` වැනි අමතර fields පසුව සකසන්න. UI එකේ නම/ස්ථානය Meta dashboard අනුව වෙනස් විය හැක.

## 5. පරීක්ෂා කිරීම

- Meta verification එක සාර්ථක නම් Verify and Save සම්පූර්ණ වේ.
- WhatsApp test number වෙත message එකක් එවූ විට Vercel → Project → Logs හි incoming event එකක් පෙනිය යුතුයි.
- `META_APP_SECRET` සකසා තිබේ නම් POST requests වල Meta signature එක පරීක්ෂා කරයි.

## වැදගත්

- Test number එකෙන් පණිවිඩ යැවීමට Meta dashboard එකේ test recipient එකක් add/verify කළ යුතු විය හැක.
- මේ starter එක incoming events log කරනවා පමණයි; userට reply එකක් යවන්නේ නැහැ.
- AI auto-reply සඳහා WhatsApp Cloud API access token, Phone Number ID, AI API endpoint, message parsing සහ send-message function එක ආරක්ෂිතව එකතු කළ යුතුයි.
- Production භාවිතයට logs තුළ message content ගබඩා කිරීමෙන් වළකින්න; privacy සහ data-retention අවශ්‍යතා සලකා බලන්න.
