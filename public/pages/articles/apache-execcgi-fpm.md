---
title: "Apache con ExecCGI y FPM"
date: "2022-09-22"
tags: ["apache", "execcgi", "fpm", "php", "ubuntu"]
summary: "Una simple receta con notas de como se debe configurar un Virtual Host con Apache para que ejecute CGIs y PHP."
author: "Alberto Ferrer"
slug: "apache-execcgi-fpm"
---

# Apache con ExecCGI y FPM

Esta configuración de Apache se realizó bajo Ubuntu 22.04 con el módulo de **proxy_fcgi**, **setenvif** y **cgid**. El módulo **cgid** se habilita cuando nuestro MPM es **event** mientras que cuando ejecutamos **prefork** el módulo a utilizar es **cgi**. 

_En Ubuntu se habilita o deshabilita el módulo mediante el comando:_ **a2enmod cgi{d}** dependiendo del MPM a utilizar. Para conocer más sobre estos comandos **a2enmod/a2dismod** pueden visitar el siguiente [enlace](https://manpages.ubuntu.com/manpages/bionic/man8/a2enmod.8.html). Para PHP-FPM puede que deban ejecutar **a2enconf** y pueden leer más sobre esto en este otro [enlace](https://manpages.ubuntu.com/manpages/trusty/man8/a2enconf.8.html).

Estos módulos se deben habilitar si nuestro MPM es **event**, esto se puede verificar mediante:

```bash
sudo apachectl status |grep -i 'Server MPM:'
```

## Configuración del Virtual Host

### Paso 1: Habilitar los módulos necesarios

```bash
sudo a2enmod cgid
sudo a2enmod proxy_fcgi
sudo a2enmod setenvif
```

### Paso 2: Configurar PHP-FPM

```bash
sudo a2enconf php8.1-fpm
```

### Paso 3: Configuración del Virtual Host

Crear el archivo de configuración del virtual host:

```apache
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/example.com
    
    # Configuración para CGI
    ScriptAlias /cgi-bin/ /var/www/example.com/cgi-bin/
    <Directory "/var/www/example.com/cgi-bin">
        AllowOverride None
        Options +ExecCGI
        AddHandler cgi-script .cgi .pl .py
        Require all granted
    </Directory>
    
    # Configuración para PHP-FPM
    <FilesMatch \.php$>
        SetHandler "proxy:unix:/var/run/php/php8.1-fpm.sock|fcgi://localhost"
    </FilesMatch>
    
    # Directorio principal
    <Directory "/var/www/example.com">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/example.com_error.log
    CustomLog ${APACHE_LOG_DIR}/example.com_access.log combined
</VirtualHost>
```

## Verificación de la configuración

### Probar CGI

Crear un script de prueba en `/var/www/example.com/cgi-bin/test.cgi`:

```bash
#!/bin/bash
echo "Content-type: text/html"
echo ""
echo "<html><head><title>CGI Test</title></head>"
echo "<body><h1>CGI funcionando correctamente</h1></body></html>"
```

Dar permisos de ejecución:

```bash
chmod +x /var/www/example.com/cgi-bin/test.cgi
```

### Probar PHP

Crear un archivo de prueba en `/var/www/example.com/test.php`:

```php
<?php
phpinfo();
?>
```

## Troubleshooting común

### Error: "End of script output before headers"

Este error suele aparecer cuando:
- El script CGI no tiene permisos de ejecución
- El script no produce headers HTTP válidos
- Hay errores de sintaxis en el script

**Solución:**
```bash
# Verificar permisos
ls -la /var/www/example.com/cgi-bin/

# Verificar logs de error
tail -f /var/log/apache2/example.com_error.log
```

### PHP-FPM no responde

**Verificar el estado del servicio:**
```bash
sudo systemctl status php8.1-fpm
```

**Verificar la configuración del socket:**
```bash
ls -la /var/run/php/php8.1-fpm.sock
```

## Consideraciones de seguridad

1. **Limitación de directorios CGI**: Solo permitir CGI en directorios específicos
2. **Validación de entrada**: Siempre validar y sanitizar inputs en scripts CGI
3. **Permisos mínimos**: Ejecutar con el menor privilegio posible
4. **Logs de auditoría**: Monitorear logs regularmente

## Conclusión

Esta configuración permite ejecutar tanto CGI como PHP-FPM de manera simultánea en Apache, proporcionando flexibilidad para aplicaciones legacy que requieren CGI mientras se mantiene el rendimiento optimizado de PHP-FPM para aplicaciones PHP modernas.

La clave está en la correcta configuración de los handlers y en asegurar que los módulos necesarios estén habilitados según el MPM utilizado por Apache.
