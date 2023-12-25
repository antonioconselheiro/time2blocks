#bin/bash

rm -rf dist

tsc --project tsconfig.light.json
cp package.json package-lock.json *.md tsconfig.json -r imgs dist/light/

tsc --project tsconfig.json
cp package.json package-lock.json *.md tsconfig.json -r imgs src/history.json dist/indexed/

lightName="@belomonte/time2blocks-light"
lightPackageJson="dist/light/package.json"

jq --arg novonome "$lightName" '.name = $novonome' $lightPackageJson > package.temp.json
mv package.temp.json $lightPackageJson
