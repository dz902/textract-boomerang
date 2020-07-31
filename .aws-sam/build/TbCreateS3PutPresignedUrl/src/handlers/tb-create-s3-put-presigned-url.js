const AWS = require('aws-sdk');
const crypto = require("crypto");

exports.handler = async (event) => {
    console.log(event);

    const response = {
        statusCode: 500,
        body: JSON.stringify('SERVER_ERROR'),
    };
    
    const S3 = new AWS.S3();

    const args = JSON.parse(event.body);

    if (!args) {
        return response;
    }

    const filename = args['filename'];
    const extMatch = filename.match(/(\.[a-z0-9]+)$/);
    
    if (extMatch === null) {
        return response;
    }
       
    const extension = extMatch[1];
    const hash = crypto.randomBytes(64).toString("hex");
    
    const objectKey = hash + extension;
    const bucketName = process.env.bucketName;
    
    const params = {
        Bucket: bucketName,
        Key: objectKey,
        Expires: 600
    };
    
    let signedUrl = null;
    
    try {
        const result = await S3.getSignedUrlPromise('putObject', params);
    
        console.log(result);
        
        signedUrl = result;
    } catch (e) {
        console.error(e);
        
        response.body = e.message;
        
        return response;
    }

    const DYNAMODB = new AWS.DynamoDB();
    const CONVERTER = AWS.DynamoDB.Converter;
    
    try {
        const putItemResult = await DYNAMODB.putItem({
            Item: CONVERTER.marshall({
                id: hash,
                filename,
                signedUrl,
                objectKey, 
                bucketName,
                status: 'WAITING',
                creationTime: Date.now()
            }),
            TableName: process.env.tableName
        }).promise();
        
        response.statusCode = 200;
        response.body = signedUrl;
    } catch (e) {
        console.error(e);
        
        response.body = e.message;
        
        return response;
    }

    return response;
};
