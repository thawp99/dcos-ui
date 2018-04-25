#!/usr/bin/env groovy

@Library('sec_ci_libs@v2-latest') _

// master_branches are for authentication library, feel free to add your feature/* branch here
def master_branches = ["master", "feature/ci"] as String[]

// release branches are for autmatic version bumps
// Do NOT add feature branches here!
// Do NOT add anything you might want to merge into a release branch here!
def release_branches = ["master", "feature/ci"] as String[]

pipeline {
  agent none

  parameters {
    booleanParam(defaultValue: false, description: 'Create release and bump package version in DC/OS', name: 'CREATE_RELEASE')
  }

  environment {
    JENKINS_VERSION = 'yes'
    NODE_PATH = 'node_modules'
    INSTALLER_URL= 'https://downloads.dcos.io/dcos/testing/master/dcos_generate_config.sh'
  }

  options {
    timeout(time: 3, unit: 'HOURS')
  }

  stages {
    stage('Authorization') {
      agent {
        label "mesos"
      }
      steps {
        user_is_authorized(master_branches, '8b793652-f26a-422f-a9ba-0d1e47eb9d89', '#frontend-dev')
      }
    }

    stage('Checkout') {
      agent {
        label "mesos"
      }
      when {
        expression {
          release_branches.contains(BRANCH_NAME) && params.CREATE_RELEASE == true
        }
      }
      steps {
        // fetch whole repo (jenkins only checks out one sha)
        sh "git fetch --tags"

        // checkout correct branch name (jenkins checks out a sha, not a named branch)
        sh "git checkout ${BRANCH_NAME}"
      }
    }

    stage('Validate Build') {
      parallel {
        stage('Lint & Unit Tests') {
          agent {
            dockerfile {
              label "mesos-sec"
            }
          }
          steps {
            sh "./scripts/pre-install"
            sh "npm install"
            sh "npm run scaffold"
            sh "npm run build-assets"
            sh "npm run validate-build"

            sh "npm run lint"

            sh "npm run test -- --maxWorkers=2"
          }
        }

        stage('Integration Test') {
          agent {
            dockerfile {
              args  '--shm-size=1g'
              label "mesos-med"
            }
          }
          steps {
            sh "./scripts/pre-install"
            sh "npm install"
            sh "npm run scaffold"
            sh "npm run build-assets"
            sh "npm run validate-build"

            sh "npm run integration-tests"
          }
          post {
            always {
              archiveArtifacts 'cypress/**/*'
              junit 'cypress/results.xml'
            }
          }
        }

        stage('System Test') {
          agent {
            dockerfile {
              args  '--shm-size=1g'
              label "mesos-med"
            }
          }
          steps {
            withCredentials([
                [
                  $class: 'AmazonWebServicesCredentialsBinding',
                  credentialsId: 'f40eebe0-f9aa-4336-b460-b2c4d7876fde',
                  accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                  secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                ]
              ]) {
              sh "./scripts/pre-install"
              sh "npm install"
              sh "npm run scaffold"
              sh "npm run build-assets"
              sh "npm run validate-build"

              sh "dcos-system-test-driver -j1 -v ./system-tests/driver-config/jenkins.sh"
            }
          }
          post {
            always {
              archiveArtifacts 'results/**/*'
              junit 'results/results.xml'
            }
          }
        }
      }
    }

    stage('Releases') {
      parallel {
        // Upload the current master as "latest" to s3
        // and update the corresponding DC/OS branch:
        // For Example:
        // - dcos-ui/master/dcos-ui-latest
        // - dcos-ui/1.12/dcos-ui-latest
        stage('Release Latest') {
          agent {
            label "mesos"
          }
          when {
            expression {
              release_branches.contains(BRANCH_NAME)
            }
          }

          steps {
            withCredentials([
                string(credentialsId: '3f0dbb48-de33-431f-b91c-2366d2f0e1cf',variable: 'AWS_ACCESS_KEY_ID'),
                string(credentialsId: 'f585ec9a-3c38-4f67-8bdb-79e5d4761937',variable: 'AWS_SECRET_ACCESS_KEY'),
                usernamePassword(credentialsId: 'a7ac7f84-64ea-4483-8e66-bb204484e58f', passwordVariable: 'GIT_PASSWORD', usernameVariable: 'GIT_USER')
            ]) {
              sh "git config --global user.email $GIT_USER@users.noreply.github.com"
              sh "git config --global user.name 'MesosphereCI Robot'"
              sh "git config credential.helper 'cache --timeout=300'"

              sh "FORCE_UPLOAD=1 ./scripts/ci/release-latest"
            }
          }

          post {
            always {
              archiveArtifacts 'buildinfo.json'
            }
          }
        }


        stage('Release Version'){
          agent {
            label "mesos"
          }
          when {
            expression {
              release_branches.contains(BRANCH_NAME) && params.CREATE_RELEASE == true
            }
          }

          steps {
            sh "./scripts/pre-install"
            sh "npm install"
            sh "npm run scaffold"
            sh "npm run build-assets"
            sh "npm run validate-build"

            withCredentials([
                string(credentialsId: 'd146870f-03b0-4f6a-ab70-1d09757a51fc',variable: 'GH_TOKEN')
            ]) {
              sh "git config --global user.email mesosphere-ci@users.noreply.github.com"
              sh "git config --global user.name 'MesosphereCI Robot'"
              sh "git config credential.helper 'cache --timeout=300'"

              sh "npm run semantic-release"
            }

            withCredentials([
                string(credentialsId: '3f0dbb48-de33-431f-b91c-2366d2f0e1cf',variable: 'AWS_ACCESS_KEY_ID'),
                string(credentialsId: 'f585ec9a-3c38-4f67-8bdb-79e5d4761937',variable: 'AWS_SECRET_ACCESS_KEY'),
                usernamePassword(credentialsId: 'a7ac7f84-64ea-4483-8e66-bb204484e58f', passwordVariable: 'GIT_PASSWORD', usernameVariable: 'GIT_USER')
            ]) {
              sh "git config --global user.email $GIT_USER@users.noreply.github.com"
              sh "git config --global user.name 'MesosphereCI Robot'"
              sh "git config credential.helper 'cache --timeout=300'"

              sh "./scripts/ci/release-version"
            }
          }
          post {
            always {
              archiveArtifacts 'pr.json'
              archiveArtifacts 'comment.json'
            }
          }
        }

        stage('Run Enterprise Pipeline') {
          agent {
            label none
          }
          when {
            expression {
              release_branches.contains(BRANCH_NAME) && params.CREATE_RELEASE == false
            }
          }
          steps {
            build job: "frontend/dcos-ui-ee-pipeline/" + env.BRANCH_NAME.replaceAll("/", "%2F"), wait: false, propagate: false
          }
        }
      }
    }
  }

  post {
    failure {
      withCredentials([
        string(credentialsId: '8b793652-f26a-422f-a9ba-0d1e47eb9d89', variable: 'SLACK_TOKEN')
      ]) {
        slackSend (
          channel: '#frontend-ci-status',
          color: 'danger',
          message: "FAILED: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]' (${env.RUN_DISPLAY_URL})",
          teamDomain: 'mesosphere',
          token: "${env.SLACK_TOKEN}",
        )
      }
    }
    unstable {
      withCredentials([
        string(credentialsId: '8b793652-f26a-422f-a9ba-0d1e47eb9d89', variable: 'SLACK_TOKEN')
      ]) {
        slackSend (
          channel: '#frontend-ci-status',
          color: 'warning',
          message: "UNSTABLE: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]' (${env.RUN_DISPLAY_URL})",
          teamDomain: 'mesosphere',
          token: "${env.SLACK_TOKEN}",
        )
      }
    }
  }
}
