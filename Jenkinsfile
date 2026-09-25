pipeline {
    agent any

    parameters {
        booleanParam(
            name: 'SIMULATE_INCIDENT',
            defaultValue: false,
            description: 'Simulate a production monitoring incident to test automated alerting'
        )

        string(
            name: 'ALERT_EMAIL',
            defaultValue: '',
            description: 'Email address for simulated monitoring alerts'
        )
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        NODE_ENV = 'test'

        // Limit SonarQube scanner memory usage on this machine
        SONAR_SCANNER_JAVA_OPTS = '-Xms128m -Xmx512m'
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
                echo 'Deploying and validating RapidCover in staging...'

                /*
                 * Node-based health checker.
                 * This replaces the PowerShell scripts that Avast was blocking.
                 */
                writeFile file: 'ci-health-check.js', text: '''
const fs = require('fs');
const http = require('http');

const environmentName = process.env.CHECK_ENV || 'staging';
const checkMode = process.env.CHECK_MODE || 'deployment';
const port = Number(process.env.CHECK_PORT || 3100);
const outputFile = process.env.CHECK_OUTPUT || 'health-check.json';
const simulateIncident =
    String(process.env.SIMULATE_INCIDENT).toLowerCase() === 'true';

process.env.NODE_ENV = environmentName;

const app = require('./src/app');

let completed = false;

const server = app.listen(port, '127.0.0.1', () => {
    console.log(
        `RapidCover ${environmentName} validation running on port ${port}`
    );

    const request = http.get(
        {
            hostname: '127.0.0.1',
            port: port,
            path: '/health',
            timeout: 5000
        },
        response => {
            let body = '';

            response.on('data', chunk => {
                body += chunk;
            });

            response.on('end', () => {
                try {
                    const health = JSON.parse(body);

                    if (simulateIncident) {
                        finish(1, {
                            status: 'incident',
                            environment: environmentName,
                            mode: checkMode,
                            port: port,
                            message:
                                'Simulated incident detected by automated monitoring.',
                            healthResponse: health,
                            checkedAt: new Date().toISOString()
                        });

                        return;
                    }

                    if (health.status !== 'ok') {
                        throw new Error(
                            'Health endpoint did not return status ok.'
                        );
                    }

                    finish(0, {
                        status: 'ok',
                        environment: environmentName,
                        mode: checkMode,
                        port: port,
                        healthResponse: health,
                        checkedAt: new Date().toISOString()
                    });
                } catch (error) {
                    finish(1, {
                        status: 'failed',
                        environment: environmentName,
                        mode: checkMode,
                        port: port,
                        message: error.message,
                        checkedAt: new Date().toISOString()
                    });
                }
            });
        }
    );

    request.on('timeout', () => {
        request.destroy(
            new Error('Health check request timed out.')
        );
    });

    request.on('error', error => {
        finish(1, {
            status: 'failed',
            environment: environmentName,
            mode: checkMode,
            port: port,
            message: error.message,
            checkedAt: new Date().toISOString()
        });
    });
});

const guardTimer = setTimeout(() => {
    finish(1, {
        status: 'timeout',
        environment: environmentName,
        mode: checkMode,
        port: port,
        message: 'Environment validation timed out.',
        checkedAt: new Date().toISOString()
    });
}, 12000);

function finish(exitCode, report) {
    if (completed) {
        return;
    }

    completed = true;
    clearTimeout(guardTimer);

    fs.writeFileSync(
        outputFile,
        JSON.stringify(report, null, 2)
    );

    console.log(JSON.stringify(report, null, 2));

    server.close(() => {
        process.exit(exitCode);
    });

    setTimeout(() => {
        process.exit(exitCode);
    }, 1000).unref();
}
'''

                withEnv([
                    'CHECK_ENV=staging',
                    'CHECK_MODE=staging-deployment',
                    'CHECK_PORT=3100',
                    'CHECK_OUTPUT=staging-health.json',
                    'SIMULATE_INCIDENT=false'
                ]) {
                    bat 'node ci-health-check.js'
                }
            }

            post {
                always {
                    archiveArtifacts(
                        artifacts: 'staging-health.json',
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

                echo 'Validating production environment...'

                withEnv([
                    'CHECK_ENV=production',
                    'CHECK_MODE=production-release',
                    'CHECK_PORT=3200',
                    'CHECK_OUTPUT=production-health.json',
                    'SIMULATE_INCIDENT=false'
                ]) {
                    bat 'node ci-health-check.js'
                }

                writeFile(
                    file: 'release-manifest.json',
                    text: """{
    "releaseTag": "${env.RELEASE_TAG}",
    "buildNumber": "${env.BUILD_NUMBER}",
    "commit": "${env.SHORT_COMMIT}",
    "environment": "production",
    "artifact": "${env.RELEASE_ARTIFACT}",
    "healthStatus": "ok"
}
"""
                )
            }

            post {
                always {
                    archiveArtifacts(
                        artifacts: 'production-release/*.tgz,production-health.json,release-manifest.json',
                        allowEmptyArchive: true,
                        fingerprint: true
                    )
                }
            }
        }

        stage('Monitoring & Alerting') {
            steps {
                echo 'Running automated production monitoring check...'

                withEnv([
                    'CHECK_ENV=production',
                    'CHECK_MODE=production-monitoring',
                    'CHECK_PORT=3300',
                    'CHECK_OUTPUT=monitoring-report.json',
                    "SIMULATE_INCIDENT=${params.SIMULATE_INCIDENT}"
                ]) {
                    bat 'node ci-health-check.js'
                }

                echo 'Production monitoring check passed.'
            }

            post {
                always {
                    archiveArtifacts(
                        artifacts: 'monitoring-report.json',
                        allowEmptyArchive: true
                    )
                }

                failure {
                    script {
                        echo 'ALERT: RapidCover production monitoring detected an incident.'

                        if (params.ALERT_EMAIL?.trim()) {
                            emailext(
                                to: params.ALERT_EMAIL.trim(),
                                subject: "RapidCover Production Alert - Build #${env.BUILD_NUMBER}",
                                body: """RapidCover automated monitoring detected a production incident.

Jenkins Build: #${env.BUILD_NUMBER}
Release: ${env.RELEASE_TAG}
Commit: ${env.SHORT_COMMIT}

The monitoring report is attached.
""",
                                attachmentsPattern: 'monitoring-report.json'
                            )
                        } else {
                            echo 'ALERT_EMAIL is blank, so no email notification was sent.'
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'RapidCover CI/CD pipeline completed successfully.'
            echo 'Build, Test, Code Quality, Security, Staging, Production Release and Monitoring all passed.'
        }

        failure {
            echo 'Pipeline stopped because a quality gate, deployment check or monitoring check failed.'
        }

        always {
            echo "Jenkins Build #${env.BUILD_NUMBER} finished."
        }
    }
}