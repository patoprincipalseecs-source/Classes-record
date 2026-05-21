#!/bin/bash
set -e
cd /workspaces/Classes-record/classes-record-app

# Build
rm -rf .expo dist node_modules/.cache
pnpm exec expo export --platform web --clear

# Required files
touch dist/.nojekyll
echo "schoolcollege.online" > dist/CNAME
cat > dist/404.html << 'HTML'
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Classes Record</title>
<script>var l=window.location,p=l.pathname+l.search+l.hash;l.replace(l.protocol+"//"+l.host+"/#"+p);</script>
</head><body>Redirecting...</body></html>
HTML

# Inject font-face CSS
python3 - << 'PYEOF'
FEATHER="assets/_node_modules/.pnpm/@expo+vector-icons@15.1.1_expo-font@14.0.11_expo@54.0.34_react-native@0.81.5_@babel+cor_2740e675501621396d5942ff373dfc3f/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ca4b48e04dc1ce10bfbddb262c8b835f.ttf"
I400="assets/_node_modules/.pnpm/@expo-google-fonts+inter@0.4.2/node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.51b6ad87261f18b6433ec52871ddfabc.ttf"
I500="assets/_node_modules/.pnpm/@expo-google-fonts+inter@0.4.2/node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.137ab18bace28dd0bd83eb3b8ed2bc54.ttf"
I600="assets/_node_modules/.pnpm/@expo-google-fonts+inter@0.4.2/node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.a5f35888d2da465de352e0dcfaf33324.ttf"
I700="assets/_node_modules/.pnpm/@expo-google-fonts+inter@0.4.2/node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.6e237de4f1f413afa2fcc45c77ac343a.ttf"
import re
with open('dist/index.html','r') as f: html=f.read()
html=re.sub(r'<style>\s*@font-face.*?</style>','',html,flags=re.DOTALL)
css=f'<style>\n@font-face{{font-family:"Feather";src:url("/{FEATHER}") format("truetype")}}\n@font-face{{font-family:"Inter_400Regular";src:url("/{I400}") format("truetype")}}\n@font-face{{font-family:"Inter_500Medium";src:url("/{I500}") format("truetype")}}\n@font-face{{font-family:"Inter_600SemiBold";src:url("/{I600}") format("truetype")}}\n@font-face{{font-family:"Inter_700Bold";src:url("/{I700}") format("truetype")}}\n</style>'
html=html.replace('</head>',css+'\n</head>')
with open('dist/index.html','w') as f: f.write(html)
print("✅ Fonts injected")
PYEOF

# Deploy
cd dist && rm -rf .git && git init && git add -A
git commit -m "Deploy: $(date)"
git remote add origin https://github.com/patoprincipalseecs-source/classes-record.git
git push --force origin HEAD:gh-pages
echo "🎉 LIVE: https://schoolcollege.online"
cd /workspaces/Classes-record
