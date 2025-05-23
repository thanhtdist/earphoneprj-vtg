// createAdminUser.js
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import AWS from 'aws-sdk';

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: 'your-region' });

export const handler = async () => {
  try {
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('your_password_here', 10);

    const user = {
      userId,
      userName: 'admin',
      password: passwordHash,
      email: 'info-adminxxx@gmail.com',
      createdAt: new Date().toISOString(),
      createdBy: '0',
      updatedAt: '',
      updatedBy: '',
      deleteFlag: 0,
      role: 0,
      active: true,
      userType: 'user',
    };

    const params = {
      TableName: 'Users',
      Item: user,
      ConditionExpression: 'attribute_not_exists(userId)',
    };

    await dynamoDB.put(params).promise();
    console.log('Admin user created successfully:', user);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Admin user created', userId }),
    };
  } catch (err) {
    console.error('Error creating admin user:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
