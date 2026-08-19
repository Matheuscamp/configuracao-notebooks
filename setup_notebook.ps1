<#
    Script de Configuração Inicial de Notebooks
    ---------------------------------------------
    O que este script faz:
    1) Altera a senha do usuário local "indi"
    2) Adiciona "indi" ao grupo Administradores locais
    3) Altera a senha da conta local Administrador
    4) Marca "senha nunca expira" e habilita a conta Administrador
    5) Renomeia o computador (hostname)

    COMO USAR:
    1. Edite as variáveis na seção "CONFIGURAÇÃO" abaixo antes de rodar.
    2. Clique com botão direito no arquivo > "Executar com PowerShell como Administrador"
       (ou abra um PowerShell como Administrador e rode: .\setup_notebook.ps1)
    3. Se aparecer erro de política de execução, rode antes (como admin):
       Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
    4. O computador será reiniciado ao final para aplicar o novo nome. Ajuste
       $reiniciarAoFinal para $false se quiser reiniciar manualmente depois.

    IMPORTANTE SOBRE SEGURANÇA:
    - Não deixe este arquivo com senhas salvas em locais compartilhados/repositórios.
    - Depois de usar, apague o arquivo ou limpe as senhas do texto.
#>

# ===================== CONFIGURAÇÃO (edite aqui) =====================
$senhaIndi        = "DEFINA_UMA_SENHA_FORTE_AQUI"
$senhaAdministrador = "DEFINA_OUTRA_SENHA_FORTE_AQUI"
$novoHostname     = "NOTEBOOK0XXX"
$reiniciarAoFinal = $true
# =======================================================================

# --- Checa se está rodando como Administrador ---
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERRO: Este script precisa ser executado como Administrador." -ForegroundColor Red
    Write-Host "Clique com o botão direito no arquivo .ps1 e escolha 'Executar como Administrador'." -ForegroundColor Yellow
    exit 1
}

Write-Host "===== Iniciando configuração do notebook =====" -ForegroundColor Cyan

# --- Descobre os nomes locais reais (funciona em PT-BR e EN-US) ---
# Grupo Administradores tem SID fixo S-1-5-32-544 em qualquer idioma
$grupoAdmins = (Get-LocalGroup -SID "S-1-5-32-544").Name

# Conta Administrador embutida tem RID 500 (últimos dígitos do SID terminam em -500)
$contaAdministrador = (Get-LocalUser | Where-Object { $_.SID -like "*-500" }).Name

Write-Host "Grupo de administradores identificado: $grupoAdmins"
Write-Host "Conta administrador embutida identificada: $contaAdministrador"

# --- 1) Alterar senha do usuário "indi" ---
try {
    $userIndi = Get-LocalUser -Name "indi" -ErrorAction Stop
    $secureIndi = ConvertTo-SecureString $senhaIndi -AsPlainText -Force
    Set-LocalUser -Name "indi" -Password $secureIndi
    Write-Host "[OK] Senha do usuário 'indi' alterada." -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Não foi possível localizar/alterar o usuário 'indi': $($_.Exception.Message)" -ForegroundColor Red
}

# --- 2) Adicionar "indi" ao grupo de Administradores ---
try {
    $jaMembro = Get-LocalGroupMember -Group $grupoAdmins | Where-Object { $_.Name -like "*\indi" -or $_.Name -eq "indi" }
    if ($jaMembro) {
        Write-Host "[INFO] 'indi' já é membro do grupo $grupoAdmins." -ForegroundColor Yellow
    } else {
        Add-LocalGroupMember -Group $grupoAdmins -Member "indi"
        Write-Host "[OK] 'indi' adicionado ao grupo $grupoAdmins." -ForegroundColor Green
    }
} catch {
    Write-Host "[ERRO] Não foi possível adicionar 'indi' ao grupo $grupoAdmins`: $($_.Exception.Message)" -ForegroundColor Red
}

# --- 3) Alterar senha da conta Administrador ---
try {
    $secureAdmin = ConvertTo-SecureString $senhaAdministrador -AsPlainText -Force
    Set-LocalUser -Name $contaAdministrador -Password $secureAdmin
    Write-Host "[OK] Senha da conta '$contaAdministrador' alterada." -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Não foi possível alterar a senha de '$contaAdministrador': $($_.Exception.Message)" -ForegroundColor Red
}

# --- 4) Senha nunca expira + habilitar conta Administrador ---
try {
    Set-LocalUser -Name $contaAdministrador -PasswordNeverExpires $true
    Enable-LocalUser -Name $contaAdministrador
    Write-Host "[OK] 'Senha nunca expira' marcado e conta '$contaAdministrador' habilitada." -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Falha ao configurar '$contaAdministrador': $($_.Exception.Message)" -ForegroundColor Red
}

# --- 5) Renomear o computador ---
try {
    $hostnameAtual = $env:COMPUTERNAME
    if ($hostnameAtual -eq $novoHostname) {
        Write-Host "[INFO] O computador já está com o nome $novoHostname." -ForegroundColor Yellow
    } else {
        Rename-Computer -NewName $novoHostname -Force -ErrorAction Stop
        Write-Host "[OK] Computador renomeado para $novoHostname (efetivo após reiniciar)." -ForegroundColor Green
    }
} catch {
    Write-Host "[ERRO] Não foi possível renomear o computador: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "===== Configuração concluída =====" -ForegroundColor Cyan

if ($reiniciarAoFinal) {
    Write-Host "Reiniciando em 15 segundos para aplicar o novo nome do computador... (Ctrl+C para cancelar)" -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    Restart-Computer -Force
} else {
    Write-Host "Lembre-se de reiniciar o computador manualmente para aplicar o novo hostname." -ForegroundColor Yellow
}
