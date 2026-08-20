# 🎓 Sistema de Generación y Almacenamiento de Documentos en PDF

Sistema web con las funcionalidades principales para el procesamiento, personalización y generación dinámica de diplomas en formato PDF, su posterior almacenamiento en una instancia de **SeaweedFS** (con interfaz API S3) y su disponibilidad para descarga por los usuarios correspondientes.

---

## 🎯 Objetivo del Proyecto

El objetivo principal del sistema es crear un **sistema de prueba** donde las funciones primordiales sean:
1. **Personalizar plantillas PDF**: Modificación dinámica de una plantilla base en formato PDF.
2. **Almacenamiento persistente en la nube / local**: Guardar automáticamente los documentos procesados en un bucket S3 gestionado por una instancia de SeaweedFS.
3. **Descarga y consulta**: Permitir la consulta y descarga de los diplomas almacenados cuando el usuario a quien pertenece el documento lo requiera.

---

## 🛠️ Tecnologías Utilizadas

- **[Astro](https://astro.build/) (v5+)**: Framework web full-stack configurado con Renderizado en Servidor (SSR) en modo standalone utilizando `@astrojs/node`.
- **Node.js (>= 22.12.0) & TypeScript**: Entorno de ejecución de backend y lenguaje principal con tipado estático.
- **[Tailwind CSS](https://tailwindcss.com/) (v4)**: Framework CSS orientado a utilidades para el diseño visual de la interfaz (integrado vía `@tailwindcss/vite`).
- **[pdf-lib](https://pdf-lib.js.org/)**: Biblioteca de manipulación de archivos PDF para agregar texto dinámico, ajustar tamaños y posicionar elementos visuales.
- **[qrcode](https://www.npmjs.com/package/qrcode)**: Generación de códigos QR en formato PNG en memoria.
- **[SeaweedFS](https://github.com/seaweedfs/seaweedfs)**: Sistema de archivos distribuido de alto rendimiento con capa de compatibilidad API Amazon S3.
- **[@aws-sdk/client-s3](https://aws.amazon.com/sdk-for-javascript/)**: Cliente oficial de AWS SDK v3 para Node.js empleado para comunicarse con SeaweedFS S3.
- **Docker / Podman**: Herramientas de contenerización para el despliegue del servicio de SeaweedFS.
- **pnpm**: Gestor de paquetes rápido y eficiente.

---

## 📋 Requisitos Previos

Asegúrate de contar con los siguientes elementos instalados en tu sistema:

- **Node.js**: Versión `>= 22.12.0`
- **pnpm**: Versión `>= 9.0` (`npm install -g pnpm` u [Otras Formas de Instalación](https://pnpm.io/installation))
- **Motor de Contenedores**: [Docker Desktop](https://www.docker.com/) / [Docker Engine](https://docs.docker.com/engine/) **O** [Podman](https://podman.io/) con `docker-compose` / `podman-compose`.

---

## 🔐 Manejo de Archivos Sensibles y Medidas de Seguridad (`s3.json`)

### ¿Qué es `s3.json`?
El archivo `s3.json` contiene la configuración de identidades, credenciales (`accessKey` y `secretKey`) y permisos de administración para la API S3 de SeaweedFS.

Ejemplo de estructura de `s3.json`:
```json
{
  "identities": [
    {
      "name": "admin",
      "credentials": [
        {
          "accessKey": "ACCESS_KEY_SEGURA",
          "secretKey": "SECRET_KEY_SEGURA"
        }
      ],
      "actions": [
        "Read",
        "Write",
        "List",
        "Tagging",
        "Admin"
      ]
    }
  ]
}
```

### ⚠️ Medidas Obligatorias para Entornos No Testeables, Staging y Producción

Dado que `s3.json` almacena las claves de acceso con privilegios sobre la infraestructura de almacenamiento, se deben implementar las siguientes medidas de seguridad:

1. **Exclusión del Control de Versiones (`.gitignore`)**:
   - **NUNCA** incluyas el archivo `s3.json` con credenciales reales en repositorios públicos o compartidos.
   - Asegúrate de incluir `s3.json` dentro del archivo `.gitignore`.
   - Mantén únicamente una plantilla como `s3.json.example` sin claves reales en el control de código.

2. **Rotación y Generación de Llaves de Alta Entropía**:
   - En entornos no testeables o de producción, **reemplaza inmediatamente las credenciales por defecto** (`admin_access_key` / `admin_secret_key`) por llaves aleatorias criptográficamente seguras de al menos 32 caracteres.

3. **Inyección de Secretos en Pipelines y Orquestadores**:
   - **Pipelines CI/CD (GitHub Actions, GitLab CI, etc.)**: Inyecta el contenido de `s3.json` mediante variables secretas (ej. `${{ secrets.S3_JSON_CONFIG }}`) creando el archivo de forma efímera durante el job.
   - **Kubernetes / Docker Swarm**: Utiliza `Kubernetes Secrets` o `Docker Secrets` para montar `/etc/seaweedfs/s3.json` de manera protegida en los nodos.
   - **Vault / AWS Secrets Manager**: Almacena y lee las claves en tiempo de ejecución a través de gestores dedicados de secretos.

4. **Principio de Menor Privilegio**:
   - En entornos de producción, configura identidades con permisos acotados únicamente a las acciones requeridas (`Read`, `Write`) sobre el bucket específico en lugar de privilegios globales de `Admin`.

5. **Permisos del Sistema de Archivos**:
   - Monta el archivo en el contenedor en modo de solo lectura (`:ro` en Docker/Podman).
   - En el sistema operativo anfitrión, asigna permisos restrictivos al archivo (por ejemplo, `chmod 600 s3.json`).

6. **Variables de Entorno en el Aplicativo Astro**:
   - El código de la aplicación interactúa con SeaweedFS utilizando variables de entorno. Define estas variables en el servidor de producción o en el archivo `.env`:
     ```env
     SEAWEEDFS_S3_ENDPOINT=http://seaweedfs:8333
     SEAWEEDFS_ACCESS_KEY=TU_ACCESS_KEY_DE_PRODUCCION
     SEAWEEDFS_SECRET_KEY=TU_SECRET_KEY_DE_PRODUCCION
     SEAWEEDFS_REGION=us-east-1
     SEAWEEDFS_BUCKET=diplomas
     ```

---

## 🚀 Instrucciones Paso a Paso para la Ejecución

### 1. Clonar el repositorio e instalar dependencias

```bash
# Clonar el proyecto
git clone <URL_DEL_REPOSITORIO>
cd diplomas-test

# Instalar dependencias
pnpm install
```

---

### 2. Iniciar la instancia de SeaweedFS con Docker o Podman

#### Opción A: Usando Docker Compose
```bash
# Levantar el contenedor de SeaweedFS en segundo plano
docker compose up -d

# Verificar el estado del servicio
docker compose ps
```

#### Opción B: Usando Podman Compose
```bash
# Iniciar el servicio con Podman Compose
podman compose up -d

# O si utilizas podman-compose
podman-compose up -d

# Verificar el contenedor en ejecución
podman ps
```

#### 🌐 Puertos Expuestos de SeaweedFS
Al iniciar la instancia se habilitan los siguientes servicios:
- **`http://localhost:8333`**: API S3 de SeaweedFS (endpoint de lectura/escritura usado por el cliente SDK).
- **`http://localhost:9333`**: Master Server UI (Dashboard de monitoreo del cluster).
- **`http://localhost:8888`**: Filer UI (Explorador web para navegar, subir y descargar archivos almacenados).

---

### 3. Configuración de Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz del proyecto para definir las variables requeridas por el aplicativo (en desarrollo se utilizarán estos valores predeterminados si el archivo no existe):

```env
SEAWEEDFS_S3_ENDPOINT=http://localhost:8333
SEAWEEDFS_ACCESS_KEY=admin_access_key
SEAWEEDFS_SECRET_KEY=admin_secret_key
SEAWEEDFS_REGION=us-east-1
SEAWEEDFS_BUCKET=diplomas
```

---

### 4. Iniciar la Aplicación Astro

#### Modo Desarrollo
```bash
# Iniciar el servidor de desarrollo
pnpm dev

# O bien en modo background (útil en entornos de desarrollo asistido)
astro dev --background
```
Abre en tu navegador la dirección: `http://localhost:4321`

#### Modo Producción
```bash
# 1. Generar la compilación de producción
pnpm build

# 2. Probar la compilación localmente
pnpm preview

# O ejecutar directamente con Node.js en el entorno de producción
node ./dist/server/entry.mjs
```

---

## 🛠️ Comandos Principales

| Comando | Acción / Descripción |
| :--- | :--- |
| `pnpm install` | Instala las dependencias del proyecto. |
| `pnpm dev` | Inicia el servidor de desarrollo local en `http://localhost:4321`. |
| `pnpm build` | Compila la aplicación para producción dentro del directorio `./dist/`. |
| `pnpm preview` | Ejecuta la versión compilada en modo previsualización. |
| `docker compose up -d` | Inicia la instancia de SeaweedFS con Docker. |
| `podman compose up -d` | Inicia la instancia de SeaweedFS con Podman. |
| `docker compose down` | Detiene y elimina los contenedores de SeaweedFS. |

---

## 📁 Estructura del Proyecto

```text
├── docker-compose.yml       # Configuración del servicio SeaweedFS
├── s3.json                  # Credenciales y permisos S3 para SeaweedFS
├── astro.config.mjs         # Configuración de Astro (modo SSR Node.js standalone)
├── package.json             # Manifiesto de dependencias y scripts del proyecto
├── public/                  # Recursos estáticos estáticos
└── src/
    ├── actions/             # Server Actions de Astro (createCertificate)
    ├── assets/              # Plantillas PDF base y recursos de apoyo
    ├── components/          # Componentes de UI en Astro (GenerateDoc.astro)
    ├── layouts/             # Plantilla de diseño general (Layout.astro)
    ├── modules/
    │   └── docs/            # Módulos de lógica de negocio (PDF, QR y S3)
    │       ├── generate-doc.ts   # Manipulación de plantilla PDF con pdf-lib
    │       ├── generate-qr.ts    # Generación del código QR en memoria
    │       └── upload-seaweed.ts # Cliente y subida de archivos a SeaweedFS via S3
    ├── pages/               # Páginas y rutas principales (index.astro)
    └── utils/               # Utilidades generales (try-catch helper)
```
