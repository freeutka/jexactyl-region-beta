#!/bin/bash

if (( $EUID != 0 )); then
    printf "\033[0;33m<jexactyl-region-beta> \033[0;31m[✕]\033[0m Please run this program as root \n"
    exit
fi

watermark="\033[0;33m<jexactyl-region-beta> \033[0;32m[✓]\033[0m"
target_dir=""

chooseDirectory() {
    echo -e "<jexactyl-region-beta> [1] /var/www/jexactyl   (choose this if you installed the panel using the official Jexactyl documentation)"
    echo -e "<jexactyl-region-beta> [2] /var/www/pterodactyl (choose this if you migrated from Pterodactyl to Jexactyl)"

    while true; do
        read -p "<jexactyl-region-beta> [?] Choose jexactyl directory [1/2]: " choice
        case "$choice" in
            1)
                target_dir="/var/www/jexactyl"
                break
                ;;
            2)
                target_dir="/var/www/pterodactyl"
                break
                ;;
            *)
                echo -e "\033[0;33m<jexactyl-region-beta> \033[0;31m[✕]\033[0m Invalid choice. Please enter 1 or 2."
                ;;
        esac
    done
}

startPterodactyl(){
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | sudo -E bash -
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    nvm install 18 || {
        printf "${watermark} nvm command not found, trying to source nvm script directly... \n"
        . ~/.nvm/nvm.sh
        nvm install 18
    }
    
    nvm use 18
    apt update
    npm install -g pnpm@9.0.6
    corepack enable 2>/dev/null || true
    pnpm install
    
    pnpm run build || {
        printf "${watermark} Build failed, trying with legacy OpenSSL provider... \n"
        export NODE_OPTIONS=--openssl-legacy-provider
        pnpm run build
    }
    
    sudo php artisan optimize:clear
}

deleteModule(){
    chooseDirectory
    printf "${watermark} Deleting module... \n"
    cd "$target_dir"
    rm -rvf jexactyl-region-beta
    printf "${watermark} Previous module successfully removed \n"
    git clone https://github.com/freeutka/jexactyl-region-beta.git
    printf "${watermark} Cloning git repository \n"
    rm -f resources/scripts/components/server/console/RegionStatBlock.tsx
    rm -f resources/scripts/components/server/console/ServerDetailsBlock.tsx
    rm -rvf resources/scripts/assets/regions
    printf "${watermark} Module files successfully removed \n"
    cd jexactyl-region-beta
    mv original-resources/ServerDetailsBlock.tsx "$target_dir/resources/scripts/components/server/console/"
    printf "${watermark} Original files successfully restored \n"
    rm -rvf "$target_dir/jexactyl-region-beta"
    cd "$target_dir"
    printf "${watermark} Git repository deleted \n"

    printf "${watermark} Module successfully deleted from your jexactyl repository. Thanks for using this module in your projects. Have a nice day \n"

    while true; do
        read -p '<jexactyl-region-beta> [?] Do you want rebuild panel assets [y/N]? ' yn
        case $yn in
            [Yy]* ) startPterodactyl; break;;
            [Nn]* ) exit;;
            * ) exit;;
        esac
    done
}

while true; do
    read -p '<jexactyl-region-beta> [?] Are you sure that you want to delete "jexactyl-region-betas" module [y/N]? ' yn
    case $yn in
        [Yy]* ) deleteModule; break;;
        [Nn]* ) printf "${watermark} Canceled \n"; exit;;
        * ) exit;;
    esac
done