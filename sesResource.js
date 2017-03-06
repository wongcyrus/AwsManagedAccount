"use strict";
const AWS = require('aws-sdk');
const response = require('cfn-response');
const config = require('./configure');

const configure = config.configure;

exports.handler = function (event, context, callback) {

    let region = configure.sesRegion;
    AWS.config.update({region});

    console.log(event);

    let responderAnr = event.ResourceProperties.ResponderAnr;

    let ses = new AWS.SES({region});

    const range = n => Array.from({length: n}, (value, key) => key);
    const rangeToNumberOfAccount = range(configure.numberOfAccount);

    const createSesRule = (key) => new Promise((resolve, reject) => {
        let params = {
            Rule: {
                /* required */
                Name: configure.prefix + key, /* required */
                Actions: [
                    {
                        S3Action: {
                            BucketName: configure.mailBox, /* required */
                            ObjectKeyPrefix: key
                        }
                    }
                ],
                Enabled: true,
                Recipients: [
                    key + configure.mailDomain
                ],
                ScanEnabled: true,
                TlsPolicy: 'Optional'
            },
            RuleSetName: configure.ruleSetName /* required */
        };
        ses.createReceiptRule(params, function (err, data) {
            if (err) {
                console.error(err);
                reject(err);
            } // an error occurred
            else     resolve(data);           // successful response
        });
    });

    const createSesRules = (lambdaAnr) => new Promise((resolve, reject) => {
        Promise.all(
            rangeToNumberOfAccount.map(i => createSesRule("AwsAccount" + i))
        ).then(results => {
            console.log(results);
            resolve("SES Rules creates completed!");
        }).catch(err => {
            console.error(err);
            reject(err);
        });
    });

    const deleteSesRule = (key) => new Promise((resolve, reject) => {
        let params = {
            RuleName: configure.prefix + key, /* required */
            RuleSetName: configure.ruleSetName /* required */
        };
        ses.deleteReceiptRule(params, function (err, data) {
            if (err) reject(err); // an error occurred
            else     resolve(data);           // successful response
        });
    });

    const deleteSesRules = () => new Promise((resolve, reject) => {
        Promise.all(
            rangeToNumberOfAccount.map(i => deleteSesRule("AwsAccount" + i))
        ).then(results => {
            console.log(results);
            resolve("SES Rules deletes completed!");
        }).catch(err => {
            console.error(err);
            reject(err);
        });
    });

    let action;
    if (event.RequestType == 'Create') {
        action = createSesRules(responderAnr);
    } else if (event.RequestType == 'Delete') {
        action = deleteSesRules();
    } else {
        callback(null, "Unrelated Event");
    }

    action
        .then(c => {
            console.log(c);
            response.send(event, context, response.SUCCESS);
            callback(null, c)
        })
        .catch(err => {
            console.log(err);
            response.send(event, context, response.FAILED);
            callback(err, null);
        });

}





