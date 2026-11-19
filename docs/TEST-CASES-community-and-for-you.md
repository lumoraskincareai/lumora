# Test cases: Community guidelines and "Suggested for you"

Manual checks for two features, plus how to run the automated tests. Run the automated tests first (section 1), then walk through sections 2 and 3 on a device or emulator.

Mark each case Pass / Fail. Say which build and device you used. Never run these against real users' data you cannot afford to change.

## 1. Automated tests

```bash
npm test                  # API (incl. profileSuggestions) + mobile (communityGuidelines)
npm run typecheck && npm run lint
```

| Area | File | Covers |
| --- | --- | --- |
| Community logic | `apps/mobile/test/communityGuidelines.test.ts` | rules content, per-user acceptance, version bump, corrupt storage, post limits, time labels, empty copy |
| Home suggestions | `apps/api/test/profileSuggestions.test.ts` | area order, sensitivities, avoid-list, pregnancy retinoid rule, budget, owned/expired, no duplicates, sensitive skin, old rows |

Screens are not covered by automated tests; sections 2 and 3 are the only check on them.

## 2. Community

Setup: a logged-in test account that has never opened Community on this device (clear app storage or reinstall to reset).

### 2.1 Guidelines popup

| ID | Steps | Expected |
| --- | --- | --- |
| C-01 | Open the Community tab for the first time | Popup "Keep our community kind" appears with 6 numbered rules. The feed is not visible behind a loaded list, and no posts request is made |
| C-02 | Look at "I agree, enter community" before ticking the box | Button is faded and tapping it does nothing |
| C-03 | Tick the confirmation box, tap "I agree, enter community" | Popup closes and the feed loads |
| C-04 | Leave Community and open it again | Popup does not show again |
| C-05 | Close and reopen the app, open Community | Popup still does not show |
| C-06 | On a fresh state, tap "Not now" | Popup closes and you land on the Brief tab. The feed is not shown |
| C-07 | After C-06, open Community again | Popup shows again |
| C-08 | On a fresh state, press the Android back button while the popup is open | Same as "Not now" (back to Brief) |
| C-09 | Log out, log in as a different user, open Community | Popup shows for the second user |
| C-10 | Log back in as the first user (who accepted) | No popup |
| C-11 | Tap the shield icon in the Community header | Rules reopen. Accepting returns to the feed. "Not now" closes it and stays on the feed |
| C-12 | Open the popup on a small phone screen | The rules list scrolls. Buttons stay reachable. Nothing is cut off |
| C-13 | Use dark theme (if available) | Text is readable in the popup |

### 2.2 Feed

| ID | Steps | Expected |
| --- | --- | --- |
| C-20 | Open Feed with posts present | Cards show avatar, author, relative time, category, title, up to 4 lines of text, images, like and comment counts |
| C-21 | Create a post, then look at its time | Shows "now" (not "0m ago") |
| C-22 | Check older posts | Times read 5m, 3h, 2d, 3w, 4mo as appropriate, followed by "ago" |
| C-23 | Switch between All / General / Products / My Story / Study Hub / Challenges | List reloads for the category |
| C-24 | Pick a category with no posts | Message "Nothing in <category> yet" |
| C-25 | Pick All with no posts at all | "No posts yet" |
| C-26 | Switch to Saved with no bookmarks | "No bookmarks yet" and a hint to long-press. The category pills are hidden |
| C-27 | Pull down on the feed | Refresh spinner shows, then the list updates |
| C-28 | Pull down on an empty feed | Refresh works there too |
| C-29 | Turn off the API or the network, open Feed | "Could not load posts" with Retry (not the empty message) |
| C-30 | Turn the network back on and tap Retry | Posts load |
| C-31 | Tap a card | Post detail opens |
| C-32 | Tap the comment pill | Post detail opens |
| C-33 | Tap the heart | Count changes immediately and the heart fills. Tap again to undo |
| C-34 | Like while offline | The count reverts after the request fails (the list reloads) |
| C-35 | Long-press a card | Action sheet opens (Bookmark, Copy, Report, Delete for own posts only) |
| C-36 | Bookmark a post, switch to Saved | The post is listed there |
| C-37 | In Saved, remove the bookmark | The post disappears from the list |
| C-38 | Delete your own post from the action sheet | Post disappears and the toast "Post deleted" shows |
| C-39 | Tap the document icon in the header | My posts opens |
| C-40 | Scroll a long feed | Smooth scrolling and the bottom card is not hidden by the tab bar |

### 2.3 Composer

| ID | Steps | Expected |
| --- | --- | --- |
| C-50 | Tap the pencil button | "New post" sheet opens. The category defaults to General |
| C-51 | Leave the text empty | Post button is faded and disabled |
| C-52 | Type only spaces | Still disabled |
| C-53 | Type text | Button becomes active and the counter shows N/2000 |
| C-54 | Type or paste more than 2000 characters | Input stops at 2000 |
| C-55 | Type more than 80 characters in the title | Input stops at 80 |
| C-56 | Post with title, text and category Products | Sheet closes, toast "Posted to the community", and the post appears in the Products feed |
| C-57 | Post with no title | Works, and the card shows no title line |
| C-58 | Add photos, then Post | Button shows "Uploading photos...", then "Posting...", then the post shows the images |
| C-59 | Post while offline | Error toast with the message and the sheet stays open with your text kept |
| C-60 | Tap X or press back with text typed | Sheet closes |
| C-61 | Open the keyboard on iOS and Android | The Post button is not covered by the keyboard (or can be scrolled to) |
| C-62 | Tap Post twice quickly | Only one post is created |

### 2.4 Accessibility

| ID | Steps | Expected |
| --- | --- | --- |
| C-70 | Turn on TalkBack or VoiceOver | Header buttons, like, comment, tabs and the popup checkbox announce meaningful labels, and the checkbox announces checked / unchecked |

## 3. "Suggested for you" on Home

Setup: API running with the catalog loaded, and test accounts with different onboarding answers. To change answers use Profile, then edit skin details.

### 3.1 Display

| ID | Steps | Expected |
| --- | --- | --- |
| H-01 | Open Home with a completed profile | "Suggested for you" card appears under the daily brief |
| H-02 | Read the card | Chips show your answers (skin type, top concerns, no-ingredients, budget). 1 to 3 areas are shown |
| H-03 | Check each product | Name, brand, price and a sentence naming the answer that produced it |
| H-04 | Check each area | Up to 2 products and 1 "Free tip" |
| H-05 | Tap a catalog product | Product detail opens |
| H-06 | Tap a product marked "You own this" | My Products opens |
| H-07 | Tap "Not quite right? Update your skin details" | Edit profile opens |
| H-08 | Change an answer, return to Home | Suggestions update without restarting the app |
| H-09 | Stop the API, open Home | The card is hidden. The rest of Home still works |
| H-10 | Open Home with no finished onboarding | No card, and no crash |

### 3.2 Rules (each against its own test account)

| ID | Profile | Expected |
| --- | --- | --- |
| H-20 | Concerns: acne, dryness (in that order) | First area is acne, second is dryness |
| H-21 | Concern: acne, acne type cystic or hormonal | Reason mentions the type. Tip tells the person to see a dermatologist |
| H-22 | Acne type: blackheads | Acne products lean to salicylic acid, clay, niacinamide, zinc |
| H-23 | No concerns, goal: hydration | Hydration area (ceramide, hyaluronic, glycerin) |
| H-24 | No concerns or goals, skin type oily | "Oily skin care" area |
| H-25 | Concern: acne and goal: clear skin | One acne area only, not two |
| H-26 | Sensitivity: fragrance | No product with fragrance appears |
| H-27 | Avoid list: an ingredient you know is in a catalog product | That product never appears |
| H-28 | Special situation: pregnant, concern: fine lines | No retinol or other retinoid appears |
| H-29 | Special situation: isotretinoin or prescription retinoid | No retinoid appears |
| H-30 | Skin reacts "often" | Gentle products rank above ones with strong acids or retinol when both match |
| H-31 | Monthly budget small (for example 500) | Total of listed prices stays within it. An area that cannot afford anything says so |
| H-32 | No budget | No budget message, and more products can appear |
| H-33 | Own a product containing a matching ingredient | It is listed first, tagged "You own this", and has no price |
| H-34 | Own a product that is expired or marked finished | It is not suggested |
| H-35 | Own a catalog product that would also match | The catalog copy is not suggested again |
| H-36 | Two areas share an ingredient (for example acne and oil control) | The same product is not shown in two areas |
| H-37 | Old account whose profile has only the original answers (no acne type, no avoid list) | Card still shows, with no errors |
| H-38 | Catalog empty | Areas show the explanation and free tips, no crash |

### 3.3 Endpoint

Replace `TOKEN` with a test user's access token and the host with your API.

```bash
# 200 with { basedOn, budget, areas, plan }
curl -s -H "Authorization: Bearer TOKEN" http://localhost:4000/recommendations/for-you

# 401 without a token
curl -i http://localhost:4000/recommendations/for-you

# 400 { "error": "Complete your skin assessment first" } for a user with no skin profile
```

| ID | Check | Expected |
| --- | --- | --- |
| H-40 | Valid token, profile present | 200, shape as above, at most 3 areas and 2 items per area |
| H-41 | No token | 401 |
| H-42 | User with no skin profile | 400 with `{ "error": ... }` |
| H-43 | Two different users | Each gets suggestions from their own profile and their own owned products only |
| H-44 | Response body | Contains no email, password hash or other users' data |

## 4. Regression

| ID | Check | Expected |
| --- | --- | --- |
| R-01 | Home brief, weather, check-in and bounties | Still load and work as before |
| R-02 | Product page, My Products, scan flows | Unchanged |
| R-03 | `npm run verify` | Passes |

## Not covered

The screens have no automated tests, so the sections above are the only check on them. Results on one device do not prove another (iOS vs Android keyboard and back-button behaviour in particular).
