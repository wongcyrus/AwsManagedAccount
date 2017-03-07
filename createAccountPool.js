"use strict";
const AWS = require('aws-sdk');
const config = require('./configure');
const fs = require('fs');

const configure = config.configure;


const organizations = new AWS.Organizations({region: 'us-east-1'});

const responseFunc = (resolve, reject, err, getData) => {
    if (err) reject(err); // an error occurred
    else {
        // console.log(getData());
        resolve(getData());           // successful response
    }
};


const getMasterAccountId = () => new Promise((resolve, reject) => {
    let r = (err, data) => responseFunc(resolve, reject, err, () => data.Organization.MasterAccountId);
    organizations.describeOrganization(r);
});

//getMasterAccountId();


const getRootId = () => new Promise((resolve, reject) => {
    let r = (err, data) => responseFunc(resolve, reject, err, () => data.Roots[0].Id);
    organizations.listRoots({}, r);
});

const createOU = (parentId) => new Promise((resolve, reject) => {
    let params = {
        Name: 'StudentOU', /* required */
        ParentId: parentId /* required */
    };
    let r = (err, data) => responseFunc(resolve, reject, err, () => data.OrganizationalUnit.Id);
    organizations.createOrganizationalUnit(params, r);
});

const createPolicy = (filePath, name, description) => new Promise((resolve, reject) => {
    let params = {
        Content: fs.readFileSync(filePath, 'utf8'),
        Description: description,
        Name: name,
        Type: "SERVICE_CONTROL_POLICY"
    };
    let r = (err, data) => responseFunc(resolve, reject, err, () => {
        let start = data.Policy.PolicySummary.Arn.lastIndexOf("p-");
        return data.Policy.PolicySummary.Arn.substr(start);
    });
    organizations.createPolicy(params, r);
});

const createBasicDeny = () => createPolicy(__dirname + `/policy/basicDeny.json`, "Basic Deny", "No IAM, EC2, and RDS.");
const createBasicAllow = () => createPolicy(__dirname + `/policy/basicAllow.json`, "Basic Allow", "Allow Server-less only.");

const createBasicPolicies = () => new Promise((resolve, reject) => {
    Promise.all([
        createBasicDeny(),
        createBasicAllow()
    ]).then(resolve)
        .catch(reject);
});


const createOUandPolicies = () => new Promise((resolve, reject) => {
    Promise.all([
        getRootId().then(createOU),
        createBasicPolicies()
    ]).then((data) => {
        resolve({ouId: data[0], policies: data[1]});
    }).catch(reject);
});

const attachPolicyToOu = (policyId, targetId) => new Promise((resolve, reject) => {
    let params = {
        PolicyId: policyId,
        TargetId: targetId
    };
    let r = (err, data) => responseFunc(resolve, reject, err, () => data);
    organizations.attachPolicy(params, r);
});

const attachPoliciesToOu = (data) => new Promise((resolve, reject) => {
    Promise.all(
        data.policies.map((policyId) => attachPolicyToOu(policyId, data.ouId))
    ).then(resolve)
        .catch(reject);
});

createOUandPolicies()
    .then(attachPoliciesToOu)
    .then(console.log)
    .catch(console.error);