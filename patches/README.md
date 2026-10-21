# Dependency compatibility patch

Expo Router 57 uses the CommonJS API of `query-string` 7. Its older URI decoder
has an exponential-time malformed-input vulnerability (GHSA-vcc3-ghjq-m6fr).
The override selects the fixed `decode-uri-component` 0.5.0; the one-line patch
reads its ESM default export from the existing CommonJS caller.

`npm ci` applies the patch through `patch-package`. Route regression tests cover
ordinary query values, reserved characters and long malformed escape sequences.
Remove this patch and override when upgrading to a compatible Expo Router
release that already includes the fixed decoder.

Other overrides select the patched gRPC 1.13.6 release and UUID 11.1.1 for the
`v4()` callers in Xcode tooling and gaxios. These do not change app record IDs,
which use the native cryptographic generator.
