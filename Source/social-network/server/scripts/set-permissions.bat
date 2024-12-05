@echo off
echo Setting MongoDB directory permissions...

set BASE_DIR=F:\BJFU_Item\BJFUNDCD\Source
set DATA_DIR=%BASE_DIR%\data

REM Create directory structure
mkdir "%BASE_DIR%" 2>nul
mkdir "%DATA_DIR%" 2>nul
mkdir "%DATA_DIR%\primary" 2>nul
mkdir "%DATA_DIR%\rs0-0" 2>nul
mkdir "%DATA_DIR%\rs0-1" 2>nul
mkdir "%DATA_DIR%\rs0-2" 2>nul

REM Set permissions
echo Setting permissions for MongoDB directories...
icacls "%DATA_DIR%" /grant:r "Everyone":(OI)(CI)F
icacls "%DATA_DIR%\primary" /grant:r "Everyone":(OI)(CI)F
icacls "%DATA_DIR%\rs0-0" /grant:r "Everyone":(OI)(CI)F
icacls "%DATA_DIR%\rs0-1" /grant:r "Everyone":(OI)(CI)F
icacls "%DATA_DIR%\rs0-2" /grant:r "Everyone":(OI)(CI)F

echo Done setting permissions.
pause