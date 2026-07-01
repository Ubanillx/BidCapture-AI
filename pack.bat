@echo off
chcp 65001 >nul

echo ========================================
echo   BidMonitor 一键打包部署脚本 v1.8
echo ========================================
echo.

cd /d %~dp0

echo [1/5] 清理旧的打包文件...
if exist bidmonitor_deploy.zip del bidmonitor_deploy.zip
if exist build_temp rmdir /s /q build_temp

echo [2/5] 构建前端...
pushd frontend
call npm install
if errorlevel 1 (
    popd
    echo 前端依赖安装失败！
    pause
    exit /b 1
)
call npm run typecheck
if errorlevel 1 (
    popd
    echo 前端类型检查失败！
    pause
    exit /b 1
)
call npm run build
if errorlevel 1 (
    popd
    echo 前端构建失败！
    pause
    exit /b 1
)
popd

echo [3/5] 创建部署包...
:: 打包后端、核心代码和前端构建产物，不包含 frontend/node_modules
powershell -NoProfile -Command "New-Item -ItemType Directory -Force build_temp | Out-Null; Copy-Item src,server -Destination build_temp -Recurse; New-Item -ItemType Directory -Force build_temp/frontend | Out-Null; Copy-Item frontend/dist -Destination build_temp/frontend -Recurse; Copy-Item frontend/src -Destination build_temp/frontend -Recurse; Copy-Item frontend/index.html,frontend/package.json,frontend/package-lock.json,frontend/tsconfig.json,frontend/vite.config.ts -Destination build_temp/frontend; Compress-Archive -Path build_temp/* -DestinationPath bidmonitor_deploy.zip -Force"

if not exist bidmonitor_deploy.zip (
    echo 打包失败！
    pause
    exit /b 1
)

echo [4/5] 打包完成！文件大小:
for %%A in (bidmonitor_deploy.zip) do echo   %%~zA bytes

echo.
echo [5/5] 上传到服务器...
echo   请修改下方配置为您的服务器信息:
echo   SERVER_IP: 您的服务器IP地址
echo   SERVER_PWD: 您的服务器密码
echo.

:: ===== 服务器配置（请修改为您的实际信息）=====
set SERVER_IP=YOUR_SERVER_IP
set SERVER_PWD=YOUR_SERVER_PASSWORD
:: =============================================

:: 检查是否有 pscp (PuTTY SCP)
where pscp >nul 2>&1
if errorlevel 1 (
    echo 未找到 pscp 命令，尝试使用 scp...
    goto :use_scp
)

:: 使用 pscp 上传（支持密码参数）
echo 创建远程目录...
echo y | plink -ssh -pw "%SERVER_PWD%" root@%SERVER_IP% "mkdir -p /opt/bidmonitor" 2>nul

echo 上传 bidmonitor_deploy.zip ...
pscp -pw "%SERVER_PWD%" -P 22 bidmonitor_deploy.zip root@%SERVER_IP%:/opt/bidmonitor/

goto :upload_done

:use_scp
:: 使用 scp（需要手动输入密码）
echo 注意: 使用 scp 需要手动输入密码
echo 建议安装 PuTTY 以支持自动密码: https://www.putty.org/
echo.

ssh -p 22 root@%SERVER_IP% "mkdir -p /opt/bidmonitor"
scp -P 22 bidmonitor_deploy.zip root@%SERVER_IP%:/opt/bidmonitor/

:upload_done
if errorlevel 1 (
    echo.
    echo 上传失败！
    pause
    exit /b 1
)

echo.
echo ========================================
echo   上传完成！
echo ========================================
echo.

:: 询问是否远程执行
set /p REMOTE_EXEC="是否立即远程执行部署? (y/n): "
if /i "%REMOTE_EXEC%"=="y" (
    echo.
    echo 正在远程执行部署脚本...
    
    where plink >nul 2>&1
    if errorlevel 1 (
        ssh -p 22 root@%SERVER_IP% "cd /opt/bidmonitor && chmod +x server/setup.sh && ./server/setup.sh"
    ) else (
        plink -ssh -pw "%SERVER_PWD%" root@%SERVER_IP% "cd /opt/bidmonitor && chmod +x server/setup.sh && ./server/setup.sh"
    )
)

echo.
echo 访问地址: http://%SERVER_IP%:8080
echo.
pause
