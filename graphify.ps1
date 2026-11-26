# Project entry point; implementation and instructions live in tools/graphify/.
& (Join-Path $PSScriptRoot 'tools/graphify/Invoke-Graphify.ps1') @args
exit $LASTEXITCODE
