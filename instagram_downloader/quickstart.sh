#!/bin/bash
# Quick start script for the refactored Instagram profile collector

echo "============================================================"
echo "Instagram Profile Collector - Quick Start"
echo "============================================================"
echo ""

# Check if Python is available
if ! command -v python &> /dev/null; then
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python not found. Please install Python 3.8 or higher."
        exit 1
    fi
    PYTHON=python3
else
    PYTHON=python
fi

echo "✓ Python found: $($PYTHON --version)"
echo ""

# Check if virtual environment exists
if [ ! -d "../.venv" ]; then
    echo "Creating virtual environment..."
    $PYTHON -m venv ../.venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment exists"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source ../.venv/bin/activate 2>/dev/null || source ../.venv/Scripts/activate 2>/dev/null

# Install dependencies
echo ""
echo "Installing dependencies..."
pip install -r requirements.txt --quiet
echo "✓ Dependencies installed"

# Check for export files
echo ""
echo "Checking for Instagram export files..."
if [ -f "data/followers_1.json" ]; then
    echo "  ✓ followers_1.json found"
else
    echo "  ⚠️  followers_1.json not found"
    echo "     Download your Instagram data and place in data/"
fi

if [ -f "data/following.json" ]; then
    echo "  ✓ following.json found"
else
    echo "  ⚠️  following.json not found"
    echo "     Download your Instagram data and place in data/"
fi

echo ""
echo "============================================================"
echo "Setup Complete!"
echo "============================================================"
echo ""
echo "Example commands:"
echo ""
echo "  # Process 10 followers (test run)"
echo "  $PYTHON main_refactored.py --mode followers --limit 10"
echo ""
echo "  # Process 50 followers"
echo "  $PYTHON main_refactored.py --mode followers --limit 50"
echo ""
echo "  # Process all following"
echo "  $PYTHON main_refactored.py --mode following"
echo ""
echo "  # Use experimental GraphQL method"
echo "  $PYTHON main_refactored.py --mode followers --method graphql --limit 20"
echo ""
echo "  # Run tests"
echo "  $PYTHON test_refactored.py"
echo ""
echo "For more options: $PYTHON main_refactored.py --help"
echo "============================================================"
