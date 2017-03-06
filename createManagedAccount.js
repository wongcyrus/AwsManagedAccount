"use strict";
const exec = require('child_process').exec;
const AWS = require('aws-sdk');
const config = require('./configure');
const S3Manager = require('./S3Manager');

const configure = config.configure;
const cloudformationTemplateName = "AwsAccountManagement.yml";
const sourcePackageName = "AwsManagedAccount_latest.zip";
console.log(configure);


const runCommand = (cmd, workingDir) => new Promise((resolve, reject) => {
    exec(cmd, {cwd: workingDir}, (error, stdout, stderr) => {
        if (error) {
            console.log(`stderr: ${stderr}`);
            console.log(`stderr: ${error}`);
            reject(`exec error: ${error}`);
            return;
        }
        console.log(cmd + `\nstdout:\n ${stdout}`);
        resolve(cmd + `\nstdout:\n ${stdout}`);
    });
});
const packageDeployment = () => runCommand('grunt --gruntfile Gruntfile.js lambda_package', __dirname + '/');

let createBucket = (bucket, region) => new Promise((resolve, reject) => {
    let s3 = new AWS.S3({region});
    let params = {
        Bucket: bucket, /* required */
        CreateBucketConfiguration: {
            LocationConstraint: region
        }
    };
    s3.createBucket(params, function (err, data) {
        //Bucket may exist and cause error, and ignore it!
        if (err && err.code != 'BucketAlreadyOwnedByYou')
            reject(err, err.stack); // an error occurred

        params = {
            AccelerateConfiguration: {
                /* required */
                Status: 'Enabled'
            },
            Bucket: bucket /* required */
        };
        s3.putBucketAccelerateConfiguration(params, function (err, data) {
            if (err) reject(err, err.stack); // an error occurred
            else     resolve(data);           // successful response
        });
    });
});
const createSourceBucket = () => createBucket(configure.sourceBucket, configure.sesRegion);
const createMailBoxBucket = () => createBucket(configure.mailBox, configure.sesRegion);

const uploadDeploymentPackage = () => new Promise((resolve, reject) => {
    let s3Manager = new S3Manager(configure.sesRegion, configure.sourceBucket);
    Promise.all([
        s3Manager.uploadFile(cloudformationTemplateName, __dirname + `/cfn/${cloudformationTemplateName}`),
        s3Manager.uploadFile(sourcePackageName, __dirname + `/dist/${sourcePackageName}`)
    ]).then(results => {
        results.forEach(console.log);
        resolve("uploadResponderPackage Completed!");
    }).catch(err => {
        reject(err);
    });
});

const createAwsAccountManagementStack = () => new Promise((resolve, reject) => {
    let params = {
        StackName: configure.prefix + "AccountManagement", /* required */
        Capabilities: [
            'CAPABILITY_NAMED_IAM'
        ],
        Parameters: [
            {
                ParameterKey: 'Prefix',
                ParameterValue: configure.prefix,
                UsePreviousValue: true
            },
            {
                ParameterKey: 'SourceBucket',
                ParameterValue: configure.sourceBucket,
                UsePreviousValue: true
            },
            {
                ParameterKey: 'MailBoxBucket',
                ParameterValue: configure.mailBox,
                UsePreviousValue: true
            }
        ],
        Tags: [
            {
                Key: 'Project',
                Value: "Account Management"
            }
        ],
        TemplateURL: `https://s3-${configure.sesRegion}.amazonaws.com/${configure.sourceBucket}/${cloudformationTemplateName}`,
        TimeoutInMinutes: 15
    };
    let cloudformation = new AWS.CloudFormation({
        region: configure.sesRegion,
        apiVersion: '2010-05-1let5'
    });
    console.log(params);
    cloudformation.createStack(params, (err, stackData) => {
        if (err) reject(err); // an error occurred
        else {
            console.log(stackData);           // successful
            resolve(stackData.ResponseMetadata.StackId);
        }
    });
});
createMailBoxBucket()
    .then(createSourceBucket)
    .then(packageDeployment)
    .then(uploadDeploymentPackage)
    .then(createAwsAccountManagementStack)
    .catch(console.error);