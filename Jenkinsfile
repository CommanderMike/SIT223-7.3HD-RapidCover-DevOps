pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        NODE_ENV = 'test'

        // Limit SonarQube scanner memory usage on this machine
        SONAR_SCANNER_JAVA_OPTS = '-Xms128m -Xmx512m'

        // Monitoring alert destination
        ALERT_EMAIL = 'mikekaranja000@gmail.com'
    }

    stages {

        stage('Build') {
            steps {
                echo 'Installing locked project dependencies...'
                bat 'call npm ci'

                script {
                    env.SHORT_COMMIT = bat(
                        returnStdout: true,
                        script: '@git rev-parse --short HEAD'
                    ).trim()

                    env.ARTIFACT_NAME =
                        "rapidcover-hd-build-${env.BUILD_NUMBER}-${env.SHORT_COMMIT}.tgz"
                }

                echo "Creating versioned artifact: ${env.ARTIFACT_NAME}"

                bat 'if exist *.tgz del /Q *.tgz'
                bat 'call npm pack'
                bat "ren rapidcover-hd-1.0.0.tgz ${env.ARTIFACT_NAME}"
            }

            post {
                success {
                    archiveArtifacts(
                        artifacts: '*.tgz',
                        fingerprint: true
                    )
                }
            }
        }

        stage('Test') {
            steps {
                echo 'Running RapidCover unit and integration tests with coverage gates...'
                bat 'call npm run test:coverage'
            }

            post {
                always {
                    archiveArtifacts(
                        artifacts: 'coverage/lcov.info,coverage/clover.xml',
                        allowEmptyArchive: true
                    )
                }
            }
        }

        stage('Code Quality') {
            steps {
                echo 'Running SonarQube Cloud code quality analysis...'

                withCredentials([
                    string(
                        credentialsId: 'sonarcloud-token',
                        variable: 'SONAR_TOKEN'
                    )
                ]) {
                    bat '''
                        call npx @sonar/scan ^
                        -Dsonar.token=%SONAR_TOKEN% ^
                        -Dsonar.javascript.node.maxspace=1024
                    '''
                }
            }
        }

        stage('Security') {
            steps {
                echo 'Running dependency security audit...'

                bat '''
                    call npm audit --json > npm-audit.json
                    call npm audit --audit-level=high
                '''
            }

            post {
                always {
                    archiveArtifacts(
                        artifacts: 'npm-audit.json',
                        allowEmptyArchive: true,
                        fingerprint: true
                    )
                }
            }
        }

        stage('Deploy to Staging') {
            steps {
                echo 'Deploying RapidCover to temporary staging environment on port 3100...'

                bat '''
                    powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:PORT='3100'; $env:NODE_ENV='staging'; $p = Start-Process -FilePath 'node' -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput 'staging-server.log' -RedirectStandardError 'staging-server-error.log'; try { Start-Sleep -Seconds 3; $response = Invoke-RestMethod -Uri 'http://127.0.0.1:3100/health' -Method Get; $response | ConvertTo-Json | Set-Content -Path 'staging-health.json'; if ($response.status -ne 'ok') { throw 'Staging health check did not return status ok.' }; Write-Host 'Staging health check passed.' } finally { if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force } }"
                '''
            }

            post {
                always {
                    archiveArtifacts(
                        artifacts: 'staging-health.json,staging-server.log,staging-server-error.log',
                        allowEmptyArchive: true
                    )
                }
            }
        }

        stage('Release to Production') {
            steps {
                echo 'Promoting tested RapidCover build to production...'

                script {
                    env.RELEASE_TAG =
                        "v1.0.${env.BUILD_NUMBER}"

                    env.RELEASE_ARTIFACT =
                        "rapidcover-hd-${env.RELEASE_TAG}-${env.SHORT_COMMIT}.tgz"
                }

                echo "Creating production release ${env.RELEASE_TAG}"
                echo "Release artifact: ${env.RELEASE_ARTIFACT}"

                bat '''
                    if not exist production-release mkdir production-release

                    copy /Y "%ARTIFACT_NAME%" ^
                    "production-release\\%RELEASE_ARTIFACT%"

                    git tag -f "%RELEASE_TAG%" HEAD
                '''

                echo 'Starting production validation environment on port 3200...'

                bat '''
                    powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:PORT='3200'; $env:NODE_ENV='production'; $p = Start-Process -FilePath 'node' -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput 'production-server.log' -RedirectStandardError 'production-server-error.log'; try { Start-Sleep -Seconds 3; $response = Invoke-RestMethod -Uri 'http://127.0.0.1:3200/health' -Method Get; $response | ConvertTo-Json | Set-Content -Path 'production-health.json'; if ($response.status -ne 'ok') { throw 'Production health check did not return status ok.' }; $manifest = [ordered]@{ releaseTag='%RELEASE_TAG%'; buildNumber='%BUILD_NUMBER%'; commit='%SHORT_COMMIT%'; environment='production'; artifact='%RELEASE_ARTIFACT%'; healthStatus=$response.status; releasedAt=(Get-Date).ToString('o') }; $manifest | ConvertTo-Json | Set-Content -Path 'release-manifest.json'; Write-Host 'Production release %RELEASE_TAG% passed health check.' } finally { if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force } }"
                '''
            }

            post {
                always {
                    archiveArtifacts(
                        artifacts: 'production-release/*.tgz,production-health.json,release-manifest.json,production-server.log,production-server-error.log',
                        allowEmptyArchive: true,
                        fingerprint: true
                    )
                }
            }
        }

        stage('Monitoring & Alerting') {
            steps {
                echo 'Monitoring RapidCover production health and system metrics...'

                script {

                    def monitoringResult = bat(
                        returnStatus: true,
                        script: '''
                            powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $env:PORT='3300'; $env:NODE_ENV='production'; $p = Start-Process -FilePath 'node' -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput 'monitoring-server.log' -RedirectStandardError 'monitoring-server-error.log'; try { Start-Sleep -Seconds 3; $samples = @(); 1..3 | ForEach-Object { $response = Invoke-RestMethod -Uri 'http://127.0.0.1:3300/health' -Method Get; $cpuInfo = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter \\"Name='_Total'\\"; $osInfo = Get-CimInstance Win32_OperatingSystem; $appProcess = Get-Process -Id $p.Id; $cpu = [double]$cpuInfo.PercentProcessorTime; $freeMemoryMB = [math]::Round($osInfo.FreePhysicalMemory / 1024, 2); $appMemoryMB = [math]::Round($appProcess.WorkingSet64 / 1MB, 2); $samples += [pscustomobject]@{ timestamp=(Get-Date).ToString('o'); health=$response.status; systemCpuPercent=[math]::Round($cpu,2); availableMemoryMB=$freeMemoryMB; appWorkingSetMB=$appMemoryMB }; Write-Host \\"Health=$($response.status), CPU=$([math]::Round($cpu,2))%, AvailableMemory=$freeMemoryMB MB, AppMemory=$appMemoryMB MB\\"; Start-Sleep -Seconds 2 }; $healthAlerts = @($samples | Where-Object { $_.health -ne 'ok' }).Count; $cpuAlerts = @($samples | Where-Object { $_.systemCpuPercent -gt 95 }).Count; $memoryAlerts = @($samples | Where-Object { $_.availableMemoryMB -lt 250 }).Count; if ($healthAlerts -gt 0 -or $cpuAlerts -ge 2 -or $memoryAlerts -ge 2) { $status='ALERT' } else { $status='HEALTHY' }; $report = [ordered]@{ application='RapidCover'; environment='production-monitoring'; buildNumber=$env:BUILD_NUMBER; commit=$env:SHORT_COMMIT; status=$status; alertRules=[ordered]@{ health='status must equal ok'; cpu='more than 95 percent for at least two samples'; availableMemory='below 250 MB for at least two samples' }; samples=$samples; generatedAt=(Get-Date).ToString('o') }; $report | ConvertTo-Json -Depth 6 | Set-Content -Path 'monitoring-report.json'; Write-Host \\"Monitoring result: $status\\"; if ($status -eq 'ALERT') { exit 2 } } finally { if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force } }"
                        '''
                    )

                    if (monitoringResult != 0) {

                        echo 'Monitoring threshold exceeded. Sending automated alert...'

                        emailext(
                            to: "${env.ALERT_EMAIL}",
                            subject: "RapidCover Monitoring Alert - Jenkins Build #${env.BUILD_NUMBER}",
                            body: """RapidCover monitoring detected an unhealthy condition.

Job: ${env.JOB_NAME}
Build: #${env.BUILD_NUMBER}
Commit: ${env.SHORT_COMMIT}

The production monitoring stage detected a failed health check or system resource threshold.

The monitoring report and server logs are attached.""",
                            attachmentsPattern: 'monitoring-report.json,monitoring-server.log,monitoring-server-error.log'
                        )

                        error('Monitoring alert triggered because a health or resource threshold was exceeded.')
                    }

                    echo 'Production monitoring completed with all health and resource thresholds within limits.'
                }
            }

            post {
                always {
                    archiveArtifacts(
                        artifacts: 'monitoring-report.json,monitoring-server.log,monitoring-server-error.log',
                        allowEmptyArchive: true,
                        fingerprint: true
                    )
                }
            }
        }
    }

    post {
        success {
            echo 'RapidCover Build, Test, Code Quality, Security, Staging, Release and Monitoring stages completed successfully.'
        }

        failure {
            echo 'Pipeline stopped because a quality gate, security check, deployment, release or monitoring stage failed.'
        }

        always {
            echo "Jenkins Build #${env.BUILD_NUMBER} finished."
        }
    }
}