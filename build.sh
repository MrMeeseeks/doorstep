#!/bin/sh
# Rebuilds Doorstep.html (the single file you open or send) from the files in src/
cd "$(dirname "$0")/src" && { echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Doorstep — rental manager</title><style>'; cat style.css; echo '</style></head><body><div id="app"></div><script>'; cat city.js core.js views1.js views3.js views2.js; echo '</script></body></html>'; } > ../Doorstep.html && cp ../Doorstep.html ../index.html
