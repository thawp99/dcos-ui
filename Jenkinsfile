#!/usr/bin/env groovy

@Library('sec_ci_libs@v2-latest') _

// master_branches are for authentication library, feel free to add your feature/* branch here
def master_branches = ["master", "feature/ci"] as String[]

// release branches are for autmatic version bumps
// Do NOT add feature branches here!
// Do NOT add anything you might want to merge into a release branch here!
def release_branches = ["master", "feature/ci"] as String[]

pipeline {
  agent {
    dockerfile {
      args '--shm-size=1g'
    }
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

    stage('Install and Build') {
      steps {
        sh "npm install --unsafe-perm"
        sh "npm run build"
        sh "tar czf release.tar.gz dist"
      }
    }

    stage('Integration Tests') {
      steps {
        sh "npm run integration-tests"
      }
      post {
        always {
          archiveArtifacts 'cypress/**/*'
          junit 'cypress/results.xml'
        }
      }
    }

    stage('System Tests') {
      steps {
        withCredentials([
            [
              $class: 'AmazonWebServicesCredentialsBinding',
              credentialsId: 'f40eebe0-f9aa-4336-b460-b2c4d7876fde',
              accessKeyVariable: 'AWS_ACCESS_KEY_ID',
              secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
            ]
          ]) {
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

    stage('Semantic Release') {
      steps {
        withCredentials([
            string(credentialsId: 'd146870f-03b0-4f6a-ab70-1d09757a51fc', variable: 'GH_TOKEN')
        ]) {
          sh "npm run semantic-release -- -d"
        }
      }
    }

    stage('Run Enterprise Pipeline') {
      when {
        expression {
          release_branches.contains(BRANCH_NAME)
        }
      }
      steps {
        build job: "frontend/dcos-ui-ee-pipeline/" + env.BRANCH_NAME.replaceAll("/", "%2F")
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
