#!/bin/sh
set -eu

case "${1:-}" in
    export|import)
        if [ "${MONEYGESTOR_MAINTENANCE_CONFIRMED:-false}" != true ]; then
            echo 'Stop all application writers (docker compose stop frontend backend), then set MONEYGESTOR_MAINTENANCE_CONFIRMED=true before running this service.' >&2
            exit 2
        fi
        ;;
esac

umask 077
exec dotnet /app/ExportImportApplication.dll "$@"
