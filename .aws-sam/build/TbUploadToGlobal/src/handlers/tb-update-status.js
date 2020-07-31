const AWS = require('aws-sdk');

exports.handler = async (event) => {
    const response = {
        statusCode: 500,
        body: JSON.stringify('Hello from Lambda!'),
    };
    
    const { tableName } = process.env;
    const localObjectKey = event['Records'][0]['s3']['object']['key'];
    
    const DYNAMODB = new AWS.DynamoDB();
    
    const CONVERTER = AWS.DynamoDB.Converter;
    const hash = localObjectKey.match(/^([a-z0-9]+)\./)[1];
    
    try {
        const updateResult = await DYNAMODB.updateItem({
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: CONVERTER.marshall({
                ':status': 'DONE'
            }),
            UpdateExpression: 'SET #status = :status',
            Key: CONVERTER.marshall({
                id: hash
            }),
            TableName: tableName
        }).promise();
        
        console.log(updateResult);
        
        response.statusCode = 200;
        response.body = updateResult;
    } catch (e) {
        response.body = e.message;
        
        return response;
    }

    return response;
};
