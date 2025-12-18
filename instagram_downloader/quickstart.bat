@echo off
REM Quick start script for Windows - Instagram profile collector

echo ============================================================
echo Instagram Profile Collector - Quick Start (Windows)
echo ============================================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Python not found. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

echo [+] Python found
python --version
echo.

REM Check if virtual environment exists
if not exist "..\\.venv" (
    echo Creating virtual environment...
    python -m venv ..\.venv
    echo [+] Virtual environment created
) else (
    echo [+] Virtual environment exists
)

REM Activate virtual environment
echo Activating virtual environment...
call ..\.venv\Scripts\activate.bat

REM Install dependencies
echo.
echo Installing dependencies...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [!] Some dependencies failed to install, but continuing...
) else (
    echo [+] Dependencies installed
)

REM Check for export files
echo.
echo Checking for Instagram export files...
if exist "data\followers_1.json" (
    echo   [+] followers_1.json found
) else (
    echo   [!] followers_1.json not found
    echo       Download your Instagram data and place in data\
)

if exist "data\following.json" (
    echo   [+] following.json found
) else (
    echo   [!] following.json not found
    echo       Download your Instagram data and place in data\
)

echo.
echo ============================================================
echo Setup Complete!
echo ============================================================
echo.
echo Example commands:
echo.
echo   REM Process 10 followers (test run)
echo   python main_refactored.py --mode followers --limit 10
echo.
echo   REM Process 50 followers
echo   python main_refactored.py --mode followers --limit 50
echo.
echo   REM Process all following
echo   python main_refactored.py --mode following
echo.
echo   REM Use experimental GraphQL method
echo   python main_refactored.py --mode followers --method graphql --limit 20
echo.
echo   REM Run tests
echo   python test_refactored.py
echo.
echo For more options: python main_refactored.py --help
echo ============================================================
echo.
pause
