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
    }

    post {
        success {
            echo 'RapidCover Build and Test stages completed successfully.'
        }

        failure {
            echo 'Pipeline stopped because a Build or Test quality gate failed.'
        }
    }
}