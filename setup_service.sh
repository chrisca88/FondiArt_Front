#!/bin/bash
set -e

# Check if running as root, if not, re-run with sudo
if [ "$(id -u)" -ne 0 ]; then
    echo "Este script necesita privilegios de administrador. Volviendo a ejecutar con sudo..."
    sudo bash "$0"
    exit $?
fi

echo "Ejecutando como root. Procediendo con la configuración..."

# Grant node the capability to bind to privileged ports
echo "Otorgando a Node.js permiso para usar el puerto 80..."
export NVM_DIR="/home/ubuntu/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"

echo "Moviendo el archivo de servicio a systemd..."
mv /home/ubuntu/FondiArt_Front/fondiart-frontend.service /etc/systemd/system/

echo "Recargando systemd..."
systemctl daemon-reload

echo "Habilitando el servicio..."
systemctl enable fondiart-frontend.service

echo "Reiniciando el servicio para aplicar los cambios..."
systemctl restart fondiart-frontend.service

echo ""
echo "¡Listo! El servicio debería estar en funcionamiento en el puerto 80."
echo "Puedes verificar su estado con: sudo systemctl status fondiart-frontend.service"