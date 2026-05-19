#!/bin/bash
set -e
echo "🔨 Building..."
cd /workspaces/Classes-record/classes-record-app
pnpm exec expo export --platform web --clear

echo "🔧 Adding .nojekyll..."
touch dist/.nojekyll

echo "✅ Paths:" && grep -E "src=|href=" dist/index.html

echo "🚀 Deploying to gh-pages..."
cd dist && rm -rf .git && git init && git add -A
git commit -m "Deploy: $(date +%Y%m%d-%H%M)"
git remote add origin https://github.com/patoprincipalseecs-source/classes-record.git
git push --force origin HEAD:gh-pages
echo "🎉 LIVE: https://patoprincipalseecs-source.github.io/classes-record"
cd /workspaces/Classes-record

# Also commit source changes to main
# cd /workspaces/Classes-record && git add -A && git commit -m "Source: $(date +%Y%m%d-%H%M)" && git push origin main
