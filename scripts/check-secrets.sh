#!/bin/sh
set -eu

patterns='(sk_live_[A-Za-z0-9]{12,}|whsec_[A-Za-z0-9]{12,}|postgres(ql)?://[^[:space:]]+:[^[:space:]@]+@)'

if git grep -IEn "$patterns" -- . \
  ':(exclude)package-lock.json' \
  ':(exclude)_COMPLETENESS_REVIEW.md' \
  ':(exclude)scripts/check-secrets.sh'; then
  echo "Potential committed credential found."
  exit 1
fi
