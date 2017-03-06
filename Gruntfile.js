//Follow https://medium.com/@SlyFireFox/micro-services-with-aws-lambda-and-api-gateway-part-1-f11aaaa5bdef
//Run
//npm install -g grunt-cli
//npm install grunt-aws-lambda grunt-pack --save-dev

var grunt = require('grunt');
grunt.loadNpmTasks('grunt-aws-lambda');

grunt.initConfig({
    lambda_invoke: {
        default: {
        }
    },
    lambda_package: {
        default: {
            options: {
                include_time: false,
                include_version: false
            }
        }
    }
});

grunt.registerTask('deploy', ['lambda_package']);
