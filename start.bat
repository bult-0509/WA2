@echo off
setlocal
title WEMOVE SPORTS - Development Server

cd /d "%~dp0"
if errorlevel 1 goto :directory_error

echo [1/4] Checking the local environment...
where node.exe >nul 2>&1
if errorlevel 1 goto :node_error
where npm.cmd >nul 2>&1
if errorlevel 1 goto :npm_error

echo [2/4] Preparing the environment file...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-env.ps1"
if errorlevel 1 goto :env_error

if not exist "node_modules\" (
    echo [3/4] Installing project dependencies...
    call npm.cmd ci
    if errorlevel 1 goto :dependency_error
) else (
    echo [3/4] Project dependencies are ready.
)

echo [4/4] Starting the project database...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local-postgres.ps1" -Action start
if errorlevel 1 goto :database_error

echo.
echo WEMOVE SPORTS is starting:
echo   Website: http://127.0.0.1:3100/
echo   Admin:   http://127.0.0.1:3100/admin/login
echo.
echo Keep this window open. Press Ctrl+C to stop the web and API servers.
echo.
call npm.cmd run dev
set "START_EXIT_CODE=%ERRORLEVEL%"
if "%START_EXIT_CODE%"=="0" exit /b 0
echo.
echo The development server exited with code %START_EXIT_CODE%.
pause
exit /b %START_EXIT_CODE%

:directory_error
echo Failed to open the project directory.
goto :fail

:node_error
echo Node.js was not found. Install Node.js 24 or newer first.
goto :fail

:npm_error
echo npm was not found. Reinstall Node.js with npm enabled.
goto :fail

:env_error
echo Failed to create or validate the local .env file.
goto :fail

:dependency_error
echo Failed to install project dependencies.
goto :fail

:database_error
echo Failed to start the project-local PostgreSQL database.
goto :fail

:fail
echo.
pause
exit /b 1
