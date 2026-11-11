# Receipt Image Attached in the WhatsApp Chat — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** In the Android app, Send on WhatsApp opens the member's chat with the receipt image already attached; the admin only taps Send.

**Design (owner approved option 1, 2026-11-11):** The page fetches the receipt image as now and passes it with the
member's number to a new bridge call `BuildMaintain.shareToWhatsApp(base64, number)`. The app saves the image to
Pictures/Build Maintain (as today) and sends WhatsApp an `ACTION_SEND` with the image and the undocumented `jid`
extra (`<number>@s.whatsapp.net`), trying `com.whatsapp` then `com.whatsapp.w4b`. No WhatsApp → Android's share
menu. The call returns false (bad number or save failed) → the page falls back to today's flow. Outside the app
(PC, phone browser, old Chrome-based app) nothing changes. Free; `jid` is unofficial and may only work for chats
or contacts the phone already has, and could stop working after a WhatsApp update.

**Tech:** existing `android/` app (versionCode 2, versionName 1.1); `src/app/admin/payments/receipt-buttons.tsx`.

## Global Constraints
- No new dependencies (web or Android). No website behaviour change outside the app.
- Number format comes from `whatsappNumber()` (`src/lib/receipt.ts`): international digits, e.g. `919876543210`.

---

### Task 1: Android — `shareToWhatsApp`

**Files:** Modify `android/app/src/main/java/app/buildmaintain/{Links,MainActivity}.java`, `android/app/build.gradle`; Test `android/app/src/test/java/app/buildmaintain/LinksTest.java`

**Produces:** JS bridge `BuildMaintain.shareToWhatsApp(String base64Png, String number) -> boolean` (true = WhatsApp or the share menu was opened with the image).

- [ ] **Step 1: Failing test**
```java
@Test public void whatsappJidNeedsInternationalDigits() {
    assertEquals("919876543210@s.whatsapp.net", Links.whatsappJid("919876543210"));
    assertNull(Links.whatsappJid(""));
    assertNull(Links.whatsappJid(null));
    assertNull(Links.whatsappJid("+919876543210"));
    assertNull(Links.whatsappJid("12345"));
}
```
Run `./gradlew test` → FAIL (cannot find symbol).

- [ ] **Step 2: Implement** in `Links`:
```java
/** WhatsApp's chat id for a number in international digits (as whatsappNumber() makes them), or null. */
static String whatsappJid(String number) {
    return number != null && number.matches("\\d{11,15}") ? number + "@s.whatsapp.net" : null;
}
```
In `MainActivity`: move the MediaStore code out of `Bridge.save` into `Uri saveFile(byte[] data, String name, String mime) throws IOException`
(`save` keeps its toasts), then add to `Bridge`:
```java
@JavascriptInterface
public boolean shareToWhatsApp(String base64, String number) {
    String jid = Links.whatsappJid(number);
    if (jid == null) return false;
    Uri image;
    try {
        image = saveFile(Base64.decode(base64, Base64.DEFAULT), "maintenance-receipt.png", "image/png");
    } catch (Exception e) {
        return false;
    }
    Intent send = new Intent(Intent.ACTION_SEND)
        .setType("image/png")
        .putExtra(Intent.EXTRA_STREAM, image)
        .putExtra("jid", jid) // unofficial: opens this chat instead of WhatsApp's contact picker
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    runOnUiThread(() -> openWhatsApp(send));
    return true;
}
```
and in `MainActivity`:
```java
private void openWhatsApp(Intent send) {
    for (String app : new String[] {"com.whatsapp", "com.whatsapp.w4b"}) {
        try {
            startActivity(new Intent(send).setPackage(app));
            return;
        } catch (ActivityNotFoundException ignored) {
            // not installed, try the next one
        }
    }
    startActivity(Intent.createChooser(send, "Send receipt")); // no WhatsApp: Android's share menu
}
```
`build.gradle`: `versionCode 2`, `versionName '1.1'`. Run `./gradlew test assembleDebug` → BUILD SUCCESSFUL.

### Task 2: Website — use the bridge inside the app

**Files:** Modify `src/app/admin/payments/receipt-buttons.tsx`

- [ ] Add a `toBase64(blob)` helper (FileReader → data URL → part after the comma). In `send()`, first thing inside
  `try`: if `window.BuildMaintain?.shareToWhatsApp` exists, `await` the image, call it with
  `whatsappNumber(contact.phone)`; on `true` show `toast.success("Receipt attached in WhatsApp. Tap Send in the chat.")`
  and return. Otherwise continue with the current flow unchanged. Update the comment above `send`.
- [ ] Run `npx tsc --noEmit`, `npm run lint`, `npm test` → clean.

### Task 3: Check, release, handover

- [ ] Emulator (debug APK + local server; it has no WhatsApp): Send on WhatsApp → image in `Pictures/Build Maintain`,
  Android's share menu opens with the image (the no-WhatsApp path). Desktop browser: unchanged flow (no bridge).
- [ ] `./gradlew assembleRelease`, `apksigner verify`, copy to `Desktop\BuildMaintain.apk`.
- [ ] HANDOVER.md entry; commit on `native-android-app`. Website change goes live only when the owner approves a push
  (the old Chrome-based app and browsers are unaffected either way).
- [ ] Owner tests on the phone: chat opens with the image attached, for a member with an existing chat and one without.
