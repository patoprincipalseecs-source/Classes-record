#!/bin/bash
set -e
cd /workspaces/Classes-record/classes-record-app

# Build
rm -rf .expo dist node_modules/.cache
pnpm exec expo export --platform web --clear

# SPA routing fix for GitHub Pages
touch dist/.nojekyll
cat > dist/404.html << 'HTML'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Classes Record</title>
  <script>
    var l = window.location;
    var base = '/classes-record';
    var path = l.pathname.replace(base, '') + l.search + l.hash;
    l.replace(l.protocol + '//' + l.host + base + '/#' + path);
  </script>
</head>
<body>Redirecting...</body>
</html>
HTML

# Deploy to gh-pages
cd dist && rm -rf .git && git init && git add -A && \
git commit -m "Deploy: $(date)" && \
git remote add origin https://github.com/patoprincipalseecs-source/classes-record.git && \
git push --force origin HEAD:gh-pages
echo "🚀 DEPLOYED!"
