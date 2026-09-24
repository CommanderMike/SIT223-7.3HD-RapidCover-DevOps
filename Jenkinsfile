pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        NODE_ENV = 'test'
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
                        -Dsonar.token=%SONAR_TOKEN%
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
    }

    post {
        success {
            echo 'RapidCover Build, Test, Code Quality, Security and Staging stages completed successfully.'
        }

        failure {
            echo 'Pipeline stopped because a quality gate or pipeline stage failed.'
        }

        always {
            echo "Jenkins Build #${env.BUILD_NUMBER} finished."
        }
    }
}