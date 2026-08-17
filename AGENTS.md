<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Definition of done

A feature is done when it has been exercised in the running app and the result observed — not when the code is written. Verify contrast on any UI change (no dark-on-dark / light-on-light; WCAG AA minimum): this project lost two days to contrast bugs in June 2026.

# Known walls

Auth and AI failures here have historically been billing/config, not code (OpenAI 429 quota Jun 15–19; auth subscription Jun 28). Check that first, and name the price of the unblock before debugging.