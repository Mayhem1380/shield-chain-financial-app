---
name: Asset delivery and Git refs
description: Replit downloadable-file presentation can affect workspace Git-visible state.
---

After presenting a downloadable file, recheck the current branch and Git status. Replit may create an asset-metadata commit on the active branch, advancing its tip even though application source is unchanged. A Git bundle made before that commit does not include it.

**Why:** presenting the supplemental ShieldChain bundle was followed by a Replit-generated metadata commit on the development branch; the bundle retained the earlier development tip.

**How to apply:** verify refs and checksums after asset presentation. Keep original bundles immutable and use a separately named bundle for any later branch tips.
