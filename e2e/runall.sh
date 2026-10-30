#!/bin/bash
cd /tmp/e2e && ./reset.sh
for p in "$@"; do node $p.mjs > /tmp/e2e/$p.out 2>&1; done
echo ALLDONE > /tmp/e2e/alldone
