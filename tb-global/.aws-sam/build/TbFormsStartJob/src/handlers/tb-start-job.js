const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log(JSON.stringify(event));
    
    const TEXTRACT = new AWS.Textract();

    const bucketName = event['Records'][0]['s3']['bucket']['name'];
    const objectKey = event['Records'][0]['s3']['object']['key'];
    
    const params = { 
        DocumentLocation: {
            S3Object: {
                Bucket: bucketName,
                Name: objectKey
            }
        },
        FeatureTypes: [
            'TABLES', 'FORMS'
        ],
        NotificationChannel: {
            RoleArn: process.env.textractSnsRoleArn,
            SNSTopicArn: process.env.textractSnsTopicArn
        }
    };
    
    console.log(params);
    
    const response = {
        statusCode: 500,
        body: JSON.stringify('ServerError'),
    };
    
    try {
        const result = await TEXTRACT.startDocumentAnalysis(params)
                                     .promise();
        
        console.log(result);
        
        response.statusCode = 200;
        response.body = JSON.stringify({ jobId: result['JobId'] });
    } catch (e) {
        response.statusCode = 400;
        response.body = JSON.stringify(e);
    }
    
    console.log(response);

    return response;
};
