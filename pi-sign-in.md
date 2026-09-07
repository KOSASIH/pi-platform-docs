# Pi Sign-in — Developer Integration Guide

Pi Sign-in lets your website offer **Pi** as a login provider, the same way sites offer
"Sign in with [external service]". Your site runs in an ordinary browser (desktop or
mobile); the user authenticates inside Pi Browser, and your site receives a short-lived
access token it can use to read the user's verified Pi identity.

`accounts.pinet.com` is a standard, spec-compliant **OAuth 2.0** server. If you have integrated
another "Sign in with" flow before, this will feel familiar.

---

## 1. OAuth implicit flow in 60 seconds

The **implicit flow** is the simplest OAuth flow. There is no backend exchange and no client
secret:

1. You redirect the user's browser to the authorization server's `/oauth/authorize` endpoint,
   passing your `client_id`, a `redirect_uri`, the `scope` you want, and an optional random
   `state` value.
2. The user authenticates and approves your app.
3. The server redirects the browser **back to your `redirect_uri`**, with an **access token in the
   URL fragment** (the part after `#`):

   ```
   https://yourapp.com/callback#access_token=xxxxx&token_type=Bearer&expires_in=3600&state=abc123
   ```

4. Your front-end JavaScript reads the token out of the fragment, verifies that `state` matches
   what it sent, and uses the token to call the API (or sends the token to your backend so that
   your backend can make requests to the Pi Platform API).

That's the whole flow — a redirect out, a redirect back, and a token in the URL fragment
(what comes after `#`). There is **no client secret**, **no code exchange**,
and **no PKCE for you to implement** — the Pi authorization server handles all of that
internally.

> **A note on flows.** Implicit flow is currently the **only** flow Pi Sign-in supports. You are
> issued a `client_id` only — no `client_secret`. Support for the authorization code flow (with
> `client_secret` / PKCE) and additional OAuth flows is **coming in a future release**. When that
> lands, your existing implicit-flow integration will keep working.

---


## 2. What you get

After a successful sign-in, you hold a short-lived **bearer access token**. Call the Pi API with
it to read the signed-in user's identity:

```http
GET https://api.minepi.com/v2/me
Authorization: Bearer <access_token>
```

```json
{
  "uid": "a1b2c3d4-...",
  "username": "pioneer123"
}
```

- **`uid`** is **app-specific** and stable per user **for your app**. The same Pi user gets a
  different `uid` in a different app, so two apps cannot correlate the same person. Use this `uid`
  as the primary key for the user's account in your system.
- Other consented fields (e.g. `preferred_language`) are returned
  alongside `uid` when you request the corresponding scope.

The token is for **authentication only** — read the identity once and mint your own session. There
is no refresh token; when the token expires, run the sign-in flow again.

### Available scopes

`scope` is a **space-delimited** list. Valid values:

| Scope                | Grants access to                          |
| -------------------- | ----------------------------------------- |
| `username`           | the user's Pi username (default)          |
| `wallet_address`     | the user's wallet address                 |

If you omit `scope`, it defaults to `username`. The `payments` scope is **not** available yet for Pi
Sign-in.

---


## 3. Configure Pi Sign-in in the Developer Portal

Before you can integrate, configure your app in the **Pi Developer Portal**.

### Step 1 — Verify your app domain

Pi Sign-in only redirects back to domains you have proven you own.

1. In your app, set **Your App's URL** (your production root domain, e.g. `https://yourapp.com`) in
   the **Configuration** page.
2. Go to **Checklist → App Domain** and complete domain verification: place the provided validation
   key in a file named `validation-key.txt` at `https://yourapp.com/validation-key.txt`, then click
   **Verify Domain**.

Until your domain is verified, you can only register **loopback** redirect URIs (for local
development). Production redirect URIs require a verified domain.

### Step 2 — Enable Pi Sign-in and get your `client_id`

1. Open the **Pi Sign-in** section for your app.
2. Toggle **Enabled** on. The portal automatically provisions your **OAuth Client ID** — copy it
   from the **oAuth Client ID** field. This `client_id` is public; there is no secret.

### Step 3 — Register your redirect URIs

Under **Redirect URIs**, click **Edit** and enter one full URI per line. The full list is replaced
on save. Rules (the portal validates these before you save):

- **Enter full URIs with protocol**, e.g. `https://yourapp.com/signin/callback`.
- Production URIs must use **`https://`** and their host must be your **verified domain**.
- **Loopback** hosts — `localhost`, `127.0.0.1`, `[::1]` — are always allowed and may use
  `http://`, so you can develop locally without verifying a domain.
- Any other host is rejected.

> A registered redirect URI stops working if its host is no longer a currently-verified domain
> (for example, if you change your app's URL). The developer portal flags any such
> "inert" URIs so you can update, remove, or re-verify them.

You now have everything you need to integrate: a `client_id` and at least one registered
`redirect_uri`.

---

## 4. Send the user to the OAuth authorization page

You have two options:
* using the Pi SDK (recommended) - see 4.1
* plain standard OAuth - see 4.2

### 4.1. Integrate with the Pi SDK (recommended)

The Pi JavaScript SDK provides a thin `Pi.signIn(...)` helper that builds the authorize URL and
navigates to it for you. Handling the callback (Step 2) is the same as the plain OAuth flow.

Load the SDK and initialize it:

```html
<script src="https://sdk.minepi.com/pi-sdk.js"></script>
<script>
  Pi.init({ version: "2.0" });
</script>
```

Then trigger sign-in:

```javascript
const state = crypto.randomUUID();
sessionStorage.setItem("pi_oauth_state", state);

Pi.signIn({
  clientId: "YOUR_CLIENT_ID",
  redirectUri: "https://yourapp.com/signin/callback",
  scopes: ["username", "wallet_address"], // optional; defaults to ["username"]
  state,                                   // optional but recommended
});
```

| Option        | Type       | Required | Notes                                              |
| ------------- | ---------- | -------- | -------------------------------------------------- |
| `clientId`    | `string`   | yes      | your Client ID from the Developer Portal           |
| `redirectUri` | `string`   | yes      | one of your registered redirect URIs               |
| `scopes`      | `string[]` | no       | array of scopes; defaults to `["username"]`        |
| `state`       | `string`   | no       | opaque CSRF value, echoed back in the redirect     |

`Pi.signIn(...)` validates its options and then navigates the browser to the authorize endpoint.
The user comes back to your `redirect_uri` exactly as described in **Section 4, Step 2** — handle
the fragment, verify `state`, and call `/v2/me` the same way.

---


### 4.2. Integrate with plain OAuth (no SDK)

You don't need any library — implicit flow is just two redirects.

When the user clicks your "Sign in with Pi" button, generate a random `state`, store it (e.g. in
`sessionStorage`), and redirect the browser to the following URL:

```
https://accounts.pinet.com/oauth/authorize
    ?response_type=token
    &client_id=YOUR_CLIENT_ID
    &redirect_uri=https://yourapp.com/signin/callback
    &scope=username%20wallet_address
    &state=RANDOM_OPAQUE_STRING
```

| Parameter       | Required | Value                                                                 |
| --------------- | -------- | --------------------------------------------------------------------- |
| `response_type` | yes      | must be `token`                                                       |
| `client_id`     | yes      | your Client ID from the Developer Portal                              |
| `redirect_uri`  | yes      | one of your registered redirect URIs (exact match)                    |
| `scope`         | no       | space-delimited scopes; defaults to `username`                        |
| `state`         | no*      | random opaque value for CSRF protection — **strongly recommended**    |


Example HTML:

```html
<a id="pi-signin">Sign in with Pi</a>

<script>
  document.getElementById("pi-signin").addEventListener("click", () => {
    const state = crypto.randomUUID();
    sessionStorage.setItem("pi_oauth_state", state);

    const url = new URL("https://accounts.pinet.com/oauth/authorize");
    url.searchParams.set("response_type", "token");
    url.searchParams.set("client_id", "YOUR_CLIENT_ID");
    url.searchParams.set("redirect_uri", "https://yourapp.com/signin/callback");
    url.searchParams.set("scope", "username wallet_address");
    url.searchParams.set("state", state);

    window.location.assign(url.toString());
  });
</script>
```

## 5. Handle the redirect back to your callback

After the end of the OAuth flow, the browser returns to your `redirect_uri` with the result in
the **URL fragment** (the part that comes after `#`).

**On success:**

```
https://yourapp.com/signin/callback#access_token=xxxxx&token_type=Bearer&expires_in=3600&state=RANDOM_OPAQUE_STRING
```

| Fragment param  | Notes                                                              |
| --------------- | ------------------------------------------------------------------ |
| `access_token`  | the bearer token; always present on success                        |
| `token_type`    | `Bearer`                                                           |
| `expires_in`    | lifetime in seconds (may be absent)                                |
| `state`         | echoed back unchanged — verify it equals what you sent             |

**On failure**, you get an `error` instead of a token:

```
https://yourapp.com/signin/callback#error=access_denied&state=RANDOM_OPAQUE_STRING
```

| `error` value   | Meaning                                          |
| --------------- | ------------------------------------------------ |
| `access_denied` | the user declined on the consent screen          |
| `expired`       | the sign-in request timed out                    |
| `cancelled`     | the user cancelled before approving              |
| `server_error`  | an unexpected server-side error occurred         |

Parse the fragment, verify `state`, then call `/v2/me`:

```html
<script>
  const params = new URLSearchParams(window.location.hash.slice(1));
  const expectedState = sessionStorage.getItem("pi_oauth_state");
  sessionStorage.removeItem("pi_oauth_state");

  if (params.get("state") !== expectedState) {
    throw new Error("State mismatch — possible CSRF, aborting.");
  }

  const error = params.get("error");
  if (error) {
    // handle access_denied / expired / cancelled / server_error
    console.error("Pi Sign-in failed:", error);
  } else {
    const accessToken = params.get("access_token");

    const me = await fetch("https://api.minepi.com/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json());

    // me = { uid, username, ... } — create your own session keyed on me.uid
  }

  // Clear the token from the URL so it isn't left in history
  history.replaceState(null, "", window.location.pathname);
</script>
```

> **Always verify `state`** before trusting the response

> You must read the token in your front-end (JavaScript code). You cannot directly read
> it from the server, because the fragment (`#`) is never sent to your server by the browser.

---

## Summary

1. **Configure** in the Developer Portal: verify your domain, enable Pi Sign-in to get a
   `client_id`, and register your redirect URIs.
2. **Redirect** the user to `https://accounts.pinet.com/oauth/authorize` with
   `response_type=token`, your `client_id`, `redirect_uri`, `scope`, and a random `state` — either
   with your own code, or via `Pi.signIn(...)`.
3. **Handle the callback**: read `access_token` from the URL fragment, verify `state`, and call
   `GET /v2/me` with the bearer token to get the user's `uid` and consented profile fields.

No client secret, no token exchange, no PKCE on your side — just two redirects and one API call.
