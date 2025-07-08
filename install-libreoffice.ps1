# Download and install LibreOffice
$downloadUrl = 'https://download.documentfoundation.org/libreoffice/stable/24.2.3/win/x86_64/LibreOffice_24.2.3_Win_x86-64.msi'
$installerPath = "$env:TEMP\LibreOffice_installer.msi"

# Download installer
Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath

# Install silently
Start-Process msiexec.exe -Wait -ArgumentList "/i $installerPath /qn"

# Add to PATH
$librePath = "C:\Program Files\LibreOffice\program"
$envPath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
if ($envPath -notlike "*$librePath*") {
    [Environment]::SetEnvironmentVariable('Path', "$envPath;$librePath", 'Machine')
}

Write-Host "LibreOffice installed successfully"
