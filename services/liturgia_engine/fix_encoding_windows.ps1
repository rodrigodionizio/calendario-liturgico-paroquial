# =============================================================================
# FIX WINDOWS ENCODING - PowerShell
# Execute este script ANTES de rodar o minerador
# =============================================================================

# Configurar UTF-8 no PowerShell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Configurar UTF-8 no CMD/Console
chcp 65001 | Out-Null

Write-Host "================================================" -ForegroundColor Green
Write-Host "   UTF-8 CONFIGURADO COM SUCESSO!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Agora você pode executar:" -ForegroundColor Yellow
Write-Host "  python miner_vaticano_v8_windows.py test 2025-01-29" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ou adicione ao seu perfil do PowerShell:" -ForegroundColor Yellow
Write-Host "  notepad `$PROFILE" -ForegroundColor Cyan
Write-Host ""
Write-Host "E adicione estas linhas:" -ForegroundColor Yellow
Write-Host "  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8" -ForegroundColor Cyan
Write-Host "  `$OutputEncoding = [System.Text.Encoding]::UTF8" -ForegroundColor Cyan
Write-Host ""
