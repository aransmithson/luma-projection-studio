@echo off
setlocal
pushd "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" goto missingRuntime
if not exist "dist\index.html" goto missingBuild
set "ELECTRON_RUN_AS_NODE="
set "VITE_DEV_SERVER_URL="
start "" "node_modules\electron\dist\electron.exe" "." %*
if errorlevel 1 goto launchFailed
popd
exit /b 0

:missingRuntime
echo The desktop runtime is missing. Run npm install in this folder first.
goto failed
:missingBuild
echo The app has not been built. Run npm run build in this folder first.
goto failed
:launchFailed
echo Windows could not start Nox. Run npm start in this folder to see the error.
:failed
pause
popd
exit /b 1
