npm install --save-dev @types/react@19.0.10 @types/node@22.13.10 --force

if [[ ! "$(npm list react-devtools)" =~ "empty" ]]; then
  npm install --save-dev react-devtools --force
fi
