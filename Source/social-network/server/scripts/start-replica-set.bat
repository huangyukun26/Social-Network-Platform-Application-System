@echo off
echo Starting MongoDB Services...

REM Set data directory
set DATA_DIR=F:\BJFU_Item\BJFUNDCD\Source\data

REM Clean up old data
echo Cleaning up old data...
rd /s /q "%DATA_DIR%\primary" 2>nul
rd /s /q "%DATA_DIR%\rs0-0" 2>nul
rd /s /q "%DATA_DIR%\rs0-1" 2>nul
rd /s /q "%DATA_DIR%\rs0-2" 2>nul

REM Create directories
mkdir "%DATA_DIR%\primary" 2>nul
mkdir "%DATA_DIR%\rs0-0" 2>nul
mkdir "%DATA_DIR%\rs0-1" 2>nul
mkdir "%DATA_DIR%\rs0-2" 2>nul

REM Kill existing MongoDB processes
taskkill /F /IM mongod.exe >nul 2>&1
timeout /t 5 /nobreak

REM Start all nodes
echo Starting MongoDB nodes...
start "MongoDB Primary" mongod --replSet rs0 --dbpath "%DATA_DIR%\primary" --port 27017 --logpath "%DATA_DIR%\primary\mongod.log" --logappend
timeout /t 5 /nobreak

start "MongoDB Secondary-1" mongod --replSet rs0 --dbpath "%DATA_DIR%\rs0-0" --port 27018 --logpath "%DATA_DIR%\rs0-0\mongod.log" --logappend
timeout /t 5 /nobreak

start "MongoDB Secondary-2" mongod --replSet rs0 --dbpath "%DATA_DIR%\rs0-1" --port 27019 --logpath "%DATA_DIR%\rs0-1\mongod.log" --logappend
timeout /t 5 /nobreak

start "MongoDB Secondary-3" mongod --replSet rs0 --dbpath "%DATA_DIR%\rs0-2" --port 27020 --logpath "%DATA_DIR%\rs0-2\mongod.log" --logappend

echo Waiting for all instances to start...
timeout /t 15 /nobreak

REM Initialize replica set
echo Initializing Replica Set...
mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017',priority:2},{_id:1,host:'localhost:27018',priority:1},{_id:2,host:'localhost:27019',priority:1},{_id:3,host:'localhost:27020',priority:1}]});"

echo Waiting for replica set initialization...
timeout /t 10 /nobreak

REM Check status
mongosh --eval "rs.status();"

echo MongoDB Replica Set is ready!
pause