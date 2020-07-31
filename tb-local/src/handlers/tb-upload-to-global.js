const AWS = require('aws-sdk');

exports.handler = async (event) => {
    const response = {
        statusCode: 500,
        body: JSON.stringify('SERVER_ERROR'),
    };

    const ssm = new AWS.SSM();
    const params = await ssm.getParameters({
        Names: ['tb-globalS3AK', 'tb-globalS3SK']
    }).promise();

    const paramsProcessed = params['Parameters'].reduce((p, c) => {
      p[c['Name']] = c['Value'];

      return p;
    }, {});

    const localS3 = new AWS.S3();
    
    const { tableName } = process.env;
    const globalS3 = new AWS.S3({
        accessKeyId: paramsProcessed['tb-globalS3AK'],
        secretAccessKey: paramsProcessed['tb-globalS3SK'],
        region: process.env.globalSourceBucketRegion
    });

    const localBucketName = event['Records'][0]['s3']['bucket']['name'];
    const localObjectKey = event['Records'][0]['s3']['object']['key'];

    try {
        const getResult = await localS3.getObject({
            Bucket: localBucketName,
            Key: localObjectKey
        }).promise();
        
        console.log(getResult);
        
        const putResult = await globalS3.putObject({
            Bucket: process.env.globalSourceBucket,
            Key: localObjectKey,
            Body: getResult.Body
        }).promise();
        
        console.log(putResult);
        
        const DYNAMODB = new AWS.DynamoDB();
        const CONVERTER = AWS.DynamoDB.Converter;
        const hash = localObjectKey.match(/^([a-z0-9]+)\./)[1];
        
        const updateResult = await DYNAMODB.updateItem({
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: CONVERTER.marshall({
                ':status': 'PROCESSING'
            }),
            UpdateExpression: 'SET #status = :status',
            Key: CONVERTER.marshall({
                id: hash
            }),
            TableName: tableName
        }).promise();
        
        console.log(updateResult);
    
        response.statusCode = 200;
    } catch (e) {
        console.error(e);
        
        response.body = e.message;
    }

    return response;
};
