const AWS = require('aws-sdk');

exports.handler = async (event) => {
    AWS.config.logger = console;

    console.log(JSON.stringify(event));

    const { globalTargetBucketName, localTargetBucketName, localTargetBucketRegion } = process.env;
    
    const job = JSON.parse(event['Records'][0]['Sns']['Message']);
   
    const ssm = new AWS.SSM();
    const params = await ssm.getParameters({
        Names: ['tb-localS3AK', 'tb-localS3SK']
    }).promise();

    const paramsProcessed = params['Parameters'].reduce((p, c) => {
      p[c['Name']] = c['Value'];

      return p;
    }, {}); 

    const TEXTRACT = new AWS.Textract(); 
    
    const textractResult = await TEXTRACT.getDocumentAnalysis({
        'JobId': job['JobId']
    }).promise();
    
    console.log(textractResult);
    
    const S3 = new AWS.S3();
    
    const objectKey = job['DocumentLocation']['S3ObjectName'] + '.json';
    const s3Result = await S3.putObject({
        Body: JSON.stringify(textractResult),
        Bucket: globalTargetBucketName,
        Key: objectKey
    }).promise();
    
    console.log(s3Result);
    
    const localS3 = new AWS.S3({
        accessKeyId: paramsProcessed['tb-localS3AK'],
        secretAccessKey: paramsProcessed['tb-localS3SK'],
        region: localTargetBucketRegion
    });
    
    const localS3Result = await localS3.putObject({
        Body: JSON.stringify(textractResult),
        Bucket: localTargetBucketName,
        Key: objectKey
    }).promise();
    
    console.log(localS3Result);
    
    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };
    
    return response;
};
