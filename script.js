function toggleStep(n){
  const chk = document.getElementById('chk'+n);
  chk.checked = !chk.checked;
  onToggle(n);
}
function onToggle(n){
  document.getElementById('step'+n).classList.toggle('on', document.getElementById('chk'+n).checked);
  render();
}
function togglePw(id, btn){
  const el = document.getElementById(id);
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  btn.textContent = show ? 'ocultar' : 'mostrar';
}
function esc(s){
  return (s || '').replace(/`/g, '``').replace(/"/g,'`"').replace(/\$/g,'`$');
}

function buildScript(){
  const s1 = document.getElementById('chk1').checked;
  const s2 = document.getElementById('chk2').checked;
  const s3 = document.getElementById('chk3').checked;
  const s4 = document.getElementById('chk4').checked;
  const restart = document.getElementById('chkRestart').checked;

  const pwIndi = esc(document.getElementById('pwIndi').value);
  const pwAdmin = esc(document.getElementById('pwAdmin').value);
  const host = esc(document.getElementById('hostname').value.trim().toUpperCase());

  if(!s1 && !s2 && !s3 && !s4){ return null; }

  const needsLookup = s1 || s2;
  let out = '';

  out += `<# Script gerado automaticamente - Setup de Notebook #>\n\n`;

  out += `# --- Checa se está rodando como Administrador ---\n`;
  out += `$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)\n`;
  out += `if (-not $isAdmin) {\n`;
  out += `    Write-Host "ERRO: execute como Administrador." -ForegroundColor Red\n`;
  out += `    exit 1\n`;
  out += `}\n\n`;

  if(needsLookup){
    out += `# --- Nomes locais reais (funciona em PT-BR e EN-US) ---\n`;
    if(s1) out += `$grupoAdmins = (Get-LocalGroup -SID "S-1-5-32-544").Name\n`;
    if(s2) out += `$contaAdministrador = (Get-LocalUser | Where-Object { $_.SID -like "*-500" }).Name\n`;
    out += `\n`;
  }

  if(s1){
    out += `# --- Usuário "indi": senha + grupo Administradores ---\n`;
    out += `try {\n`;
    out += `    $secureIndi = ConvertTo-SecureString "${pwIndi}" -AsPlainText -Force\n`;
    out += `    Set-LocalUser -Name "indi" -Password $secureIndi\n`;
    out += `    $jaMembro = Get-LocalGroupMember -Group $grupoAdmins | Where-Object { $_.Name -like "*\\indi" -or $_.Name -eq "indi" }\n`;
    out += `    if (-not $jaMembro) { Add-LocalGroupMember -Group $grupoAdmins -Member "indi" }\n`;
    out += `    Write-Host "[OK] Usuário indi configurado." -ForegroundColor Green\n`;
    out += `} catch { Write-Host "[ERRO] indi: $($_.Exception.Message)" -ForegroundColor Red }\n\n`;
  }

  if(s2){
    out += `# --- Conta Administrador: senha + nunca expira + habilitar ---\n`;
    out += `try {\n`;
    out += `    $secureAdmin = ConvertTo-SecureString "${pwAdmin}" -AsPlainText -Force\n`;
    out += `    Set-LocalUser -Name $contaAdministrador -Password $secureAdmin\n`;
    out += `    Set-LocalUser -Name $contaAdministrador -PasswordNeverExpires $true\n`;
    out += `    Enable-LocalUser -Name $contaAdministrador\n`;
    out += `    Write-Host "[OK] Conta Administrador configurada." -ForegroundColor Green\n`;
    out += `} catch { Write-Host "[ERRO] Administrador: $($_.Exception.Message)" -ForegroundColor Red }\n\n`;
  }

  if(s3){
    out += `# --- Renomear computador ---\n`;
    out += `try {\n`;
    out += `    if ($env:COMPUTERNAME -ne "${host}") {\n`;
    out += `        Rename-Computer -NewName "${host}" -Force -ErrorAction Stop\n`;
    out += `        Write-Host "[OK] Renomeado para ${host}." -ForegroundColor Green\n`;
    out += `    } else { Write-Host "[INFO] Já está com esse nome." -ForegroundColor Yellow }\n`;
    out += `} catch { Write-Host "[ERRO] Rename: $($_.Exception.Message)" -ForegroundColor Red }\n\n`;
  }

  if(s4){
    out += `# --- Páginas de download dos softwares ---\n`;
    out += `$linksDownload = [ordered]@{\n`;
    out += `    "LibreOffice"     = "https://pt-br.libreoffice.org/baixar/"\n`;
    out += `    "Adobe Reader"    = "https://get.adobe.com/reader/"\n`;
    out += `    "7-Zip"           = "https://www.7-zip.org/download.html"\n`;
    out += `    "Microsoft Teams" = "https://www.microsoft.com/microsoft-teams/download-app"\n`;
    out += `    "Google Chrome"   = "https://www.google.com/chrome/"\n`;
    out += `    "Mozilla Firefox" = "https://www.mozilla.org/firefox/new/"\n`;
    out += `    "AnyDesk"         = "https://anydesk.com/en/downloads"\n`;
    out += `    "FortiClient"     = "https://www.fortinet.com/support/product-downloads"\n`;
    out += `}\n`;
    out += `foreach ($item in $linksDownload.GetEnumerator()) { Start-Process $item.Value; Start-Sleep -Milliseconds 400 }\n\n`;
    out += `$caminhosEdge = @("$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe", "\${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe")\n`;
    out += `if (-not ($caminhosEdge | Where-Object { Test-Path $_ })) { Start-Process "https://www.microsoft.com/edge" }\n\n`;
  }

  out += `Write-Host "===== Concluído =====" -ForegroundColor Cyan\n`;

  if(s3 && restart){
    out += `Start-Sleep -Seconds 15\n`;
    out += `Restart-Computer -Force\n`;
  }

  return out;
}

function highlight(code){
  return code
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/(#.*$)/gm, '<span class="tok-comment">$1</span>')
    .replace(/(&quot;.*?&quot;)/g, '<span class="tok-str">$1</span>')
    .replace(/\b(try|catch|if|else|foreach|exit)\b/g, '<span class="tok-kw">$1</span>')
    .replace(/(\$[A-Za-z_][A-Za-z0-9_]*)/g, '<span class="tok-var">$1</span>');
}

function render(){
  const code = buildScript();
  const out = document.getElementById('codeOut');
  if(!code){
    out.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty-note';
    empty.textContent = '// selecione ao menos uma etapa à esquerda para gerar o script';
    out.appendChild(empty);
    return;
  }
  out.innerHTML = highlight(code.replace(/&quot;/g, '"'));
}

function downloadCode(){
  const code = buildScript();
  if(!code) return;
  const blob = new Blob([code], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'setup_notebook.ps1';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

render();