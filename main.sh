#!/bin/bash

if (( $EUID != 0 )); then
    printf "\033[0;33m<jexactyl-region-beta> \033[0;31m[✕]\033[0m Please run this programm as root \n"
    exit
fi

echo "BETA | USE AT YOU OWN RISK"
echo "FOR JEXPANEL V4 ONLY!"
echo "This program is free software: you can redistribute it and/or modify."
echo "[1] Install module"
echo "[2] Delete module"
echo "[3] Exit"
echo ""

read -p "<jexactyl-region-beta> [✓] Please enter a number: " choice
if [ $choice == "1" ]; then
    sudo bash ./install.sh
fi
if [ $choice == "2" ]; then
    sudo bash ./delete.sh
fi
if [ $choice == "3" ]; then
    exit
fi