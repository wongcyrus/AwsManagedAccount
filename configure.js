"use strict";

const mailDomain = "@cloudlabhk.com";
const prefix = "test1";
module.exports.configure = {
    projectId: "AwsManagedAccount",
    prefix,
    mailDomain,
    awsAccount: "ive",
    errorReportEmail: "cytmp-awsaccountmanagement@yahoo.com",
    region: "ap-southeast-1",
    sesRegion: "us-west-2",
    ruleSetName: "default-rule-set",
    senderEmail: "noreply" + mailDomain,
    errorEmail: "error" + mailDomain,
    numberOfAccount: 1,

    sourceBucket: "aws-managed-account-source",
    mailBox: "aws-account-email-cloudlabhk-com"
};